import VillasAmenities from "./VillasAmenities";
import VillasMap from "./VillasMap";

export default function VillasExtras() {
  return (
    <div className="mt-12 md:mt-16 grid gap-8 lg:grid-cols-2 items-start">
      <VillasAmenities />
      <VillasMap />
    </div>
  );
}
