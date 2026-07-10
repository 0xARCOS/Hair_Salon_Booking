import { ClientForm } from "@/components/ClientForm";

export default function NewClientPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nueva ficha de clienta</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Crea el registro tras la llamada o el primer contacto.
        </p>
      </div>
      <ClientForm />
    </div>
  );
}
