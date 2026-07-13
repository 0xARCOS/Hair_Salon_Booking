// IndexedDB en memoria para que Dexie (db.ts) funcione bajo Node.
// Debe importarse antes que cualquier módulo que abra la base.
import "fake-indexeddb/auto";
