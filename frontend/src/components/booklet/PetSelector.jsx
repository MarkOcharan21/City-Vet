import { PawPrint } from "lucide-react";
import { resolveMediaUrl } from "../../utils/mediaUrl";
import { AVATAR_PLACEHOLDER } from "./sampleData";

export default function PetSelector({ pets, activeToken, onSelect }) {
  if (!pets || pets.length < 2) return null;

  return (
    <div className="booklet-pet-selector">
      <span className="booklet-pet-selector__label">
        <PawPrint size={15} strokeWidth={2.4} /> My Pets
      </span>
      <div className="booklet-pet-selector__list" role="tablist" aria-label="Switch pet booklet">
        {pets.map((pet) => {
          const isActive = pet.qr_token === activeToken;
          return (
            <button
              key={pet.qr_token ?? pet.id ?? pet.pet_code}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`booklet-pet-selector__pet${isActive ? " is-active" : ""}`}
              onClick={() => onSelect?.(pet)}
            >
              <img
                src={resolveMediaUrl(pet.photo, AVATAR_PLACEHOLDER)}
                alt=""
                aria-hidden="true"
              />
              <span className="booklet-pet-selector__detail">
                <span className="booklet-pet-selector__pet-name">{pet.pet_name}</span>
                <span className="booklet-pet-selector__pet-code">{pet.pet_code}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}