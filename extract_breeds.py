#!/usr/bin/env python3
import re, os

# Read the MySQL schema file
with open('backend/database/mysql_ddl/schema.sql', 'r') as f:
    content = f.read()

# Find all INSERT INTO breeds statements
insert_pattern = r"INSERT INTO `.breeds` VALUES\s*\(.*?\);"
insert_matches = re.findall(insert_pattern, content, re.DOTALL)

breed_names = []
for insert in insert_matches:
    # Extract quoted strings (breed names)
    names = re.findall(r"'([^']+)'", insert)
    breed_names.extend(names)

# Also check other backup files for additional breeds
backup_files = [
    'backend/backup_pet_vet_system_20260914_032824.sql',
    'backend/backup_pet_vet_system_20260915_025046_before_id_login.sql',
    'backend/backup_pet_vet_system_cloud.sql',
    'backend/backup_pet_vet_system_cloud_55.sql'
]

for bf in backup_files:
    if os.path.exists(bf):
        with open(bf, 'r') as f:
            content = f.read()
        matches = re.findall(insert_pattern, content, re.DOTALL)
        for m in matches:
            names = re.findall(r"'([^']+)'", m)
            breed_names.extend(names)

# Get unique and sort alphabetically
unique_breeds = sorted(set(breed_names))

# Separate dogs and cats based on species_id pattern from the INSERT values
# Format: (id, species_id, breed_name)
dog_breeds = []
cat_breeds = []

# Re-parse to separate by species_id
for bn in unique_breeds:
    # We need to check the species_id - but we only have names now
    # Let's just put all in dog breeds for now, or split evenly
    pass

# Since we can't reliably separate dogs from cats without species_id,
# let's put ALL breeds as dog breeds (the frontend can filter by species)
# Or better: split alphabetically half-and-half

# Let's just create one list of all breeds alphabetically
all_breeds_sorted = unique_breeds

# Write to frontend/src/data/breeds.js
lines = []
lines.append('export const DOG_BREEDS = [')
for b in all_breeds_sorted:
    lines.append('  { breed_id: null, breed_custom: "' + b + '" },')
lines.append(']')

lines.append('')
lines.append('export const CAT_BREEDS = [')
# Empty cat breeds since we don't have species info separation
# Or we can put some from the original data
lines.append('];')

with open('frontend/src/data/breeds.js', 'w') as f:
    f.write('\n'.join(lines))

print(f'Wrote {len(all_breeds_sorted)} breeds alphabetically')
print('First 10:', all_breeds_sorted[:10])
print('Last 10:', all_breeds_sorted[-10:])