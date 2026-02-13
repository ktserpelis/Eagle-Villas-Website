export default function VillasMap() {

  return (
    <div className="rounded-2xl overflow-hidden bg-black/10 backdrop-blur-[2px]">
      {/* title bar */}
     <div className="px-4 py-2.5 flex items-center justify-between">
          <h3 className="text-[11px] font-medium uppercase tracking-[0.32em] text-white/85">
          Location
        </h3>
      </div>

      {/* map */}
      <div className="h-[250px] bg-stone-400/30">
        <iframe
          title="Eagle Villas map"
          className="w-full h-full"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4408.279911325338!2d20.67471898102826!3d38.623014110730324!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x135db72ee3de3e57%3A0x663b1a6a1bcf4851!2sSivota%20Lefkas%20Eagle%20Villas!5e0!3m2!1sen!2sgr!4v1770986324452!5m2!1sen!2sgr`}
        />
      </div>
    </div>
  );
}
