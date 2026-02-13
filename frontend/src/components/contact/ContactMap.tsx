export default function ContactMap() {
  return (
    <section className="bg-white/90 rounded-3xl shadow-[0_14px_30px_rgba(24,20,15,0.10)] border border-amber-50 overflow-hidden">
      <div className="p-4 pb-2 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">
            Find us in Sivota
          </h2>
          <p className="text-[11px] text-stone-600">
            Eagle Villas • Sivota, Leykas, Greece
          </p>
        </div>
      </div>

      <div className="h-52 sm:h-60 md:h-64">
        <iframe
          title="Eagle Villas"
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4408.279911325338!2d20.67471898102826!3d38.623014110730324!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x135db72ee3de3e57%3A0x663b1a6a1bcf4851!2sSivota%20Lefkas%20Eagle%20Villas!5e0!3m2!1sen!2sgr!4v1770986324452!5m2!1sen!2sgr"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="w-full h-full border-0"
        />
      </div>
    </section>
  );
}
