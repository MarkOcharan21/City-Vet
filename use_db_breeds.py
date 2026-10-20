# Use database breeds
dog_breeds = ['Aspin', 'Labrador', 'Shih Tzu']  # species_id 1 = dogs
cat_breeds = ['Persian', 'Puspin']  # species_id 2 = cats

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

print(f'Wrote {len(dog_breeds)} dog breeds and {len(cat_breeds)} cat breeds from database')
print('Dog breeds:', dog_breeds)
print('Cat breeds:', cat_breeds)