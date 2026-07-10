import type { Service } from "@irene/supabase";

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(price);
}

interface ServiceListProps {
  services: Service[];
}

// La carta del salón: lista con puntos conductores, como una carta impresa.
export function ServiceList({ services }: ServiceListProps) {
  if (services.length === 0) {
    return (
      <p className="carta-empty reveal">
        Estamos actualizando la carta. Llámanos y te contamos precios al momento.
      </p>
    );
  }

  return (
    <ul className="carta reveal">
      {services.map((service) => (
        <li className="carta-row" key={service.id}>
          <div className="carta-name">
            <span>{service.name}</span>
            <span className="carta-meta">
              {service.duration_mins} min
              {service.is_multi_session && " · varias sesiones"}
            </span>
          </div>
          <span className="carta-leader" aria-hidden />
          <span className="carta-price">{formatPrice(service.price)}</span>
        </li>
      ))}
    </ul>
  );
}
