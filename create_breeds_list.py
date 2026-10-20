#!/usr/bin/env python3
# Comprehensive dog and cat breeds, alphabetically sorted
# Based on the existing breed data in the system

dog_breeds = [
  'Aspin', 'Airedale Terrier', 'Akita', 'Alaskan Malamute', 'American Pit Bull Terrier',
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
  'Shih Tzu', 'Shiba Inu', 'Silver', 'Skye Terrier', 'Soft-Coated Wheaten Terrier',
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

# Sort alphabetically
dog_breeds.sort()
cat_breeds.sort()

lines = []
lines.append('export const DOG_BREEDS = [')
for d in dog_breeds:
    lines.append('  { breed_id: null, breed_custom: "' + d + '" },')
lines.append(']')

lines.append('')
lines.append('export const CAT_BREEDS = [')
for c in cat_breeds:
    lines.append('  { breed_id: null, breed_custom: "' + c + '" },')
lines.append(']')

with open('frontend/src/data/breeds.js', 'w') as f:
    f.write('\n'.join(lines))

dog_count = len(dog_breeds)
cat_count = len(cat_breeds)
total = dog_count + cat_count

print(f'Wrote {dog_count} dog breeds and {cat_count} cat breeds alphabetically (total: {total})')
print('Dog breeds count:', dog_count)
print('Cat breeds count:', cat_count)
print('First 5 dog:', dog_breeds[:5])
print('First 5 cat:', cat_breeds[:5])
print('Last 5 dog:', dog_breeds[-5:])
print('Last 5 cat:', cat_breeds[-5:])