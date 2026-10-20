dog = [
  'Aspin','Shih Tzu','Pomeranian','Maltese','Yorkshire Terrier',
  'Chihuahua','Poodle (Toy)','Poodle (Miniature)','Poodle (Standard)',
  'Beagle','Dachshund','French Bulldog','Bulldog','Cocker Spaniel',
  'Labrador Retriever','Golden Retriever','German Shepherd','Rottweiler',
  'Boxer','Doberman Pinscher','Siberian Husky','Belgian Malinois',
  'Border Collie','Australian Shepherd','Jack Russell Terrier',
  'Miniature Pinscher','Bichon Frise','Pekingese','Japanese Spitz',
  'Lhasa Apso','Miniature Schnauzer','Standard Schnauzer','Great Dane',
  'Saint Bernard','Alaskan Malamute','Chow Chow','Shar Pei',
  'American Pit Bull Terrier','Staffordshire Bull Terrier','Shiba Inu',
  'Akita','Corgi (Pembroke)','Corgi (Cardigan)','Pug','Boston Terrier',
  'Havanese','Silky Terrier','West Highland White Terrier','Scottish Terrier',
  'Airedale Terrier','Bull Terrier','Whippet','Greyhound','Dalmatian',
  'Samoyed','Keeshond','Schipperke','Italian Greyhound','Papillon',
  'Brussels Griffon','Cavalier King Charles Spaniel','King Charles Spaniel',
  'English Springer Spaniel','English Cocker Spaniel','Irish Setter',
  'Gordon Setter','Weimaraner','Vizsla','Rhodesian Ridgeback','Afghan Hound',
  'Basenji','Basset Hound','Bloodhound','Coonhound','Foxhound'
]

cat = [
  'Domestic Shorthair','Domestic Longhair','Domestic Medium Hair',
  'Persian','Maine Coon','Siamese','British Shorthair','Ragdoll',
  'Scottish Fold','Sphynx','Bengal','American Shorthair','Exotic Shorthair',
  'Birman','Russian Blue','Norwegian Forest Cat','Abyssinian',
  'Burmese','Oriental Shorthair','Himalayan','Turkish Angora',
  'Munchkin','Savannah','Balinese','Tonkinese','Cornish Rex',
  'Devon Rex','Chartreux','Egyptian Mau','American Curl','Somali',
  'Manx','Japanese Bobtail','Pixie-Bob','Singapura','Ocicat',
  'Selkirk Rex','LaPerm','Bombay','Nebelung'
]

# Sort alphabetically
dog.sort()
cat.sort()

lines = []
lines.append('export const DOG_BREEDS = [')
for d in dog:
    lines.append('  { breed_id: null, breed_custom: "' + d + '" },')
lines.append(']')

lines.append('')
lines.append('export const CAT_BREEDS = [')
for c in cat:
    lines.append('  { breed_id: null, breed_custom: "' + c + '" },')
lines.append(']')

with open('frontend/src/data/breeds.js', 'w') as f:
    f.write('\n'.join(lines))

print('Done: wrote breeds.js with ' + str(len(dog)) + ' dogs and ' + str(len(cat)) + ' cats (sorted alphabetically)')