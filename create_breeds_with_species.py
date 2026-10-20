#!/usr/bin/env python3
# Dog and cat breeds with id, species_id, and breed_name (matching frontend expectation)
# species_id 1 = dogs, species_id 2 = cats
# The frontend expects: { id, species_id, breed_name }

dog_breeds = [
  'Airedale Terrier', 'Akita', 'Alaskan Malamute', 'American Pit Bull Terrier',
  'American Staffordshire Terrier', 'Australian Shepherd', 'Basenji', 'Basset Hound',
  'Beagle', 'Belgian Malinois', 'Bernese Mountain Dog', 'Bloodhound', 'Bluetick Coonhound',
  'Border Collie', 'Border Terrier', 'Boston Terrier', 'Bull Terrier', 'Cairn Terrier',
  'Cavalier King Charles Spaniel', 'Chihuahua', 'Chinese Crested', 'Chow Chow',
  'Cocker Spaniel', 'Collie', 'Corgi (Pembroke)', 'Corgi (Cardigan)', 'Dachshund',
  'English Springer Spaniel', 'English Cocker Spaniel', 'Curly-Coated Retriever',
  'Dandie Dinmont Terrier', 'Doberman Pinscher', 'English Foxhound', 'English Toy Spaniel',
  'Fila Brasileiro', 'Finnish Lapphund', 'French Bulldog', 'German Shepherd',
  'German Shorthaired Pointer', 'Giant Schnauzer', 'Goldendoodle', 'Golden Retriever',
  'Goldador', 'Great Dane', 'Greater Swiss Mountain Dog', 'Havanese', 'Irish Setter',
  'Irish Terrier', 'Irish Wolfhound', 'Italian Greyhound', 'Japanese Chin',
  'Japanese Spitz', 'Keeshond', 'Labrador Retriever', 'Lakeland Terrier',
  'Leonberger', 'Maltese', 'Mastiff', 'Mexican Hairless', 'Norwegian Elkhound',
  'Norwegian Lundehund', 'Norwegian Buhund', 'Old English Sheepdog', 'Papillon',
  'Parson Russell Terrier', 'Petit Basset Griffon Vendéen', 'Pharaoh Hound',
  'Plott Hound', 'Poodle (Standard)', 'Poodle (Miniature)', 'Poodle (Toy)',
  'Pug', 'Puggle', 'Rat Terrier', 'Rhodesian Ridgeback', 'Rottweiler',
  'Saint Bernard', 'Samoyed', 'Schnauzer (Giant)', 'Schnauzer (Miniature)',
  'Schnauzer (Standard)', 'Scottish Terrier', 'Sealyham Terrier', 'Shetland Sheepdog',
  'Shih Tzu', 'Shiba Inu', 'Skye Terrier', 'Soft-Coated Wheaten Terrier',
  'Staffordshire Bull Terrier', 'Swedish Vallhund', 'Tibetan Mastiff', 'Toy Poodle',
  'Toy Fox Terrier', 'Treeing Tennessee Brindle', 'Vizsla', 'Weimaraner', 'Welsh Terrier',
  'West Highland White Terrier', 'Whippet', 'Wirehaired Pointing Griffon', 'Yorkshire Terrier'
]

cat_breeds = [
  'Abyssinian', 'American Shorthair', 'Balinese', 'Bengal', 'Birman',
  'British Shorthair', 'Cornish Rex', 'Devon Rex', 'Egyptian Mau',
  'Exotic Shorthair', 'European Burmese', 'Japanese Bobtail', 'Maine Coon',
  'Manx', 'Norwegian Forest Cat', 'Ocicat', 'Oriental Shorthair', 'Persian',
  'Ragdoll', 'Russian Blue', 'Savannah', 'Siamese', 'Scottish Fold',
  'Selkirk Rex', 'Sphynx', 'Turkish Angora', 'Turkish Van', 'York Chocolate'
]

# Assign id (1-based) and species_id: 1 for dogs, 2 for cats
# The frontend expects: { id, species_id, breed_name }
dog_entries = []
for i, d in enumerate(dog_breeds, 1):
    # Escape any special characters in the breed name for JavaScript
    escaped = d.replace('\\', '\\\\').replace('"', '\\"')
    dog_entries.append(f'  {{ id: {i}, species_id: 1, breed_name: "{escaped}" }},')

cat_entries = []
for i, c in enumerate(cat_breeds, 1):
    escaped = c.replace('\\', '\\\\').replace('"', '\\"')
    cat_entries.append(f'  {{ id: {len(dog_breeds) + i}, species_id: 2, breed_name: "{escaped}" }},')

# Sort dog entries by breed_name alphabetically (they're already sorted since dog_breeds was sorted)
# Sort cat entries by breed_name alphabetically (they're already sorted)

lines = []
lines.append('export const DOG_BREEDS = [')
lines.extend(dog_entries)
lines.append(']')

lines.append('')
lines.append('export const CAT_BREEDS = [')
lines.extend(cat_entries)
lines.append(']')

with open('frontend/src/data/breeds.js', 'w') as f:
    f.write('\n'.join(lines))

dog_count = len(dog_breeds)
cat_count = len(cat_breeds)
total = dog_count + cat_count

print(f'Wrote {dog_count} dog breeds and {cat_count} cat breeds with id, species_id, breed_name')
print('Dog breeds count:', dog_count)
print('Cat breeds count:', cat_count)
print('First 3 dog:', dog_breeds[:3])
print('First 3 cat:', cat_breeds[:3])
print('Last 3 dog:', dog_breeds[-3:])
print('Last 3 cat:', cat_breeds[-3:])