import PropertyCard from "./PropertyCard.tsx";

type Props = {
  properties: any[]; // swap to Property[] if you have it typed
};

export default function PropertyGrid({ properties }: Props) {
  return (
    <div className="grid gap-6 md:gap-8 lg:grid-cols-2">
      {properties.map((p) => (
        <PropertyCard key={p.id} property={p} />
      ))}
    </div>
  );
}
