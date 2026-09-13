import {
  Syringe,
  ShieldCheck,
  UtensilsCrossed,
  HeartPulse,
  TriangleAlert,
  PawPrint,
  Stethoscope,
  PhoneCall,
} from "lucide-react";

const ICONS = {
  syringe: Syringe,
  shield: ShieldCheck,
  bowl: UtensilsCrossed,
  heart: HeartPulse,
  alert: TriangleAlert,
  paw: PawPrint,
  stethoscope: Stethoscope,
  phone: PhoneCall,
};

export default function PetCareGuide({ items }) {
  return (
    <div className="care-guide">
      {items.map((item, index) => {
        const Icon = ICONS[item.icon] || PawPrint;
        return (
          <article className="care-guide__item" key={index}>
            <div className="care-guide__icon">
              <Icon size={20} strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="care-guide__title">{item.title}</h3>
              <p className="care-guide__text">{item.text}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}