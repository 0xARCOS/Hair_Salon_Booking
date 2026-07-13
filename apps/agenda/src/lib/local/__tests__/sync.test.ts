import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import type { ClientFicha, ClientFoto } from "@salon-app/supabase";

// El "remoto" (server actions + Storage) se sustituye por mocks controlables
// por test; lo que se verifica aquí es la lógica de conflicto de sync.ts.
vi.mock("@/actions/fichas", () => ({
  upsertFichaIfNewer: vi.fn(async () => {}),
  pullFicha: vi.fn(async () => null),
  pullFotosMeta: vi.fn(async () => []),
  pushFotoMeta: vi.fn(async () => {}),
  deleteFotoRemote: vi.fn(async () => {}),
}));

const storageMock = {
  upload: vi.fn(async () => ({ error: null })),
  download: vi.fn(async () => ({ data: new Blob([new Uint8Array([9, 9])]), error: null })),
  remove: vi.fn(async () => ({ error: null })),
};

vi.mock("@salon-app/supabase/browser", () => ({
  createClient: () => ({ storage: { from: () => storageMock } }),
}));

import {
  upsertFichaIfNewer,
  pullFicha,
  pullFotosMeta,
  deleteFotoRemote,
  pushFotoMeta,
} from "@/actions/fichas";
import {
  syncFichaPull,
  syncFichaPush,
  syncFotosPull,
  syncFotosSweep,
  requestFotoDeletion,
} from "../sync";
import { localDB, type FichaLocal, type FotoLocal } from "../db";

const CLIENT_ID = "22222222-2222-2222-2222-222222222222";

function localFicha(overrides: Partial<FichaLocal> = {}): FichaLocal {
  return {
    clientId: CLIENT_ID,
    alergias: "local",
    preferencias: "",
    notas: "notas locales",
    formulas: [],
    createdAt: 1_000,
    updatedAt: 2_000,
    ...overrides,
  };
}

function remoteFicha(updatedAtMs: number): ClientFicha {
  return {
    client_id: CLIENT_ID,
    alergias: "remoto",
    preferencias: "remoto",
    notas: "notas remotas",
    formulas: [],
    enc: null,
    updated_at: new Date(updatedAtMs).toISOString(),
    created_at: new Date(500).toISOString(),
  } as ClientFicha;
}

function remoteFoto(id: string): ClientFoto {
  return {
    id,
    client_id: CLIENT_ID,
    storage_path: `${CLIENT_ID}/${id}.bin`,
    caption: "",
    enc: false,
    mime_type: "image/jpeg",
    created_at: new Date(1_000).toISOString(),
    deleted_at: null,
  } as ClientFoto;
}

beforeEach(async () => {
  vi.clearAllMocks();
  await Promise.all([localDB.fichas.clear(), localDB.fotos.clear(), localDB.meta.clear()]);
});

afterAll(async () => {
  await localDB.delete();
});

describe("syncFichaPull — last-write-wins", () => {
  it("no pisa una edición local más nueva que el remoto", async () => {
    await localDB.fichas.put(localFicha({ updatedAt: 5_000 }));
    vi.mocked(pullFicha).mockResolvedValue(remoteFicha(3_000));

    await syncFichaPull(CLIENT_ID);

    const after = await localDB.fichas.get(CLIENT_ID);
    expect(after!.notas).toBe("notas locales");
    expect(after!.updatedAt).toBe(5_000);
    expect(after!.syncedAt).toBeUndefined(); // sigue pendiente de push
  });

  it("tampoco pisa cuando local y remoto tienen el mismo updatedAt", async () => {
    await localDB.fichas.put(localFicha({ updatedAt: 3_000 }));
    vi.mocked(pullFicha).mockResolvedValue(remoteFicha(3_000));

    await syncFichaPull(CLIENT_ID);

    expect((await localDB.fichas.get(CLIENT_ID))!.notas).toBe("notas locales");
  });

  it("aplica el remoto cuando es más nuevo y lo marca sincronizado", async () => {
    await localDB.fichas.put(localFicha({ updatedAt: 2_000 }));
    vi.mocked(pullFicha).mockResolvedValue(remoteFicha(9_000));

    await syncFichaPull(CLIENT_ID);

    const after = await localDB.fichas.get(CLIENT_ID);
    expect(after!.notas).toBe("notas remotas");
    expect(after!.updatedAt).toBe(9_000);
    expect(after!.createdAt).toBe(1_000); // conserva el createdAt local
    expect(after!.syncedAt).toBeGreaterThan(0);
  });

  it("crea la ficha local si solo existe en remoto", async () => {
    vi.mocked(pullFicha).mockResolvedValue(remoteFicha(9_000));

    await syncFichaPull(CLIENT_ID);

    expect((await localDB.fichas.get(CLIENT_ID))!.alergias).toBe("remoto");
  });
});

describe("syncFichaPush", () => {
  it("sube una ficha pendiente y la marca sincronizada", async () => {
    await localDB.fichas.put(localFicha({ updatedAt: 2_000 }));

    await syncFichaPush(CLIENT_ID);

    expect(upsertFichaIfNewer).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: CLIENT_ID, notas: "notas locales", updatedAt: 2_000 })
    );
    expect((await localDB.fichas.get(CLIENT_ID))!.syncedAt).toBeGreaterThan(0);
  });

  it("no sube nada si la ficha ya está sincronizada", async () => {
    await localDB.fichas.put(localFicha({ updatedAt: 2_000, syncedAt: 2_500 }));

    await syncFichaPush(CLIENT_ID);

    expect(upsertFichaIfNewer).not.toHaveBeenCalled();
  });

  it("no marca synced si el usuario guardó una versión más nueva durante la subida", async () => {
    await localDB.fichas.put(localFicha({ updatedAt: 2_000 }));
    vi.mocked(upsertFichaIfNewer).mockImplementation(async () => {
      // Simula un save() concurrente mientras la subida está en vuelo.
      await localDB.fichas.update(CLIENT_ID, { updatedAt: 7_777 });
    });

    await syncFichaPush(CLIENT_ID);

    expect((await localDB.fichas.get(CLIENT_ID))!.syncedAt).toBeUndefined();
  });
});

describe("fotos — soft-delete y pendientes", () => {
  it("una foto borrada en otro dispositivo se elimina localmente y no resucita", async () => {
    await localDB.fotos.add({
      clientId: CLIENT_ID,
      blob: new Blob([new Uint8Array([1])]),
      caption: "",
      createdAt: 1_000,
      mimeType: "image/jpeg",
      enc: false,
      remoteId: "foto-borrada",
    } satisfies FotoLocal);
    // pullFotosMeta excluye las soft-deleted: el remoto la devuelve vacía.
    vi.mocked(pullFotosMeta).mockResolvedValue([]);

    await syncFotosPull(CLIENT_ID);
    expect(await localDB.fotos.where("clientId").equals(CLIENT_ID).count()).toBe(0);

    // Un pull posterior tampoco la vuelve a descargar (no resucita).
    await syncFotosPull(CLIENT_ID);
    expect(storageMock.download).not.toHaveBeenCalled();
    expect(await localDB.fotos.where("clientId").equals(CLIENT_ID).count()).toBe(0);
  });

  it("una foto local pendiente de subir (sin remoteId) NO se borra en el pull", async () => {
    await localDB.fotos.add({
      clientId: CLIENT_ID,
      blob: new Blob([new Uint8Array([1])]),
      caption: "pendiente",
      createdAt: 1_000,
      mimeType: "image/jpeg",
      enc: false,
    } satisfies FotoLocal);
    vi.mocked(pullFotosMeta).mockResolvedValue([]);

    await syncFotosPull(CLIENT_ID);

    expect(await localDB.fotos.where("clientId").equals(CLIENT_ID).count()).toBe(1);
  });

  it("descarga las fotos remotas que faltan localmente", async () => {
    vi.mocked(pullFotosMeta).mockResolvedValue([remoteFoto("foto-nueva")]);

    await syncFotosPull(CLIENT_ID);

    const fotos = await localDB.fotos.where("clientId").equals(CLIENT_ID).toArray();
    expect(fotos).toHaveLength(1);
    expect(fotos[0].remoteId).toBe("foto-nueva");
  });

  it("sube las fotos pendientes y les asigna remoteId", async () => {
    await localDB.fotos.add({
      clientId: CLIENT_ID,
      blob: new Blob([new Uint8Array([1, 2, 3])]),
      caption: "antes",
      createdAt: 1_000,
      mimeType: "image/jpeg",
      enc: false,
    } satisfies FotoLocal);

    await syncFotosSweep(CLIENT_ID);

    expect(storageMock.upload).toHaveBeenCalledTimes(1);
    expect(pushFotoMeta).toHaveBeenCalledTimes(1);
    const [foto] = await localDB.fotos.where("clientId").equals(CLIENT_ID).toArray();
    expect(foto.remoteId).toBeTruthy();
  });

  it("un borrado fallido (offline) queda en cola y se reintenta en el sweep", async () => {
    storageMock.remove.mockResolvedValueOnce({ error: new Error("offline") as never });

    await requestFotoDeletion(CLIENT_ID, "foto-x");
    expect(deleteFotoRemote).not.toHaveBeenCalled(); // falló antes de llegar

    // De vuelta online: el sweep vacía la cola.
    await syncFotosSweep(CLIENT_ID);
    expect(storageMock.remove).toHaveBeenCalledTimes(2);
    expect(deleteFotoRemote).toHaveBeenCalledWith("foto-x");
    expect(await localDB.meta.get("pendingFotoDeletes")).toBeUndefined();
  });
});
