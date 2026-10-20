import re, os

# Read the backup SQL file
sql_file = 'backend/backup_pet_vet_system_20260905_165849.sql'
with open(sql_file, 'r') as f:
    content = f.read()

# Extract breed names from INSERT INTO breeds VALUES
pattern = r"INSERT INTO `breeds` VALUES\s*\((.*?)\)"
matches = re.findall(pattern, content)

breeds = set()
for match in matches:
    # Find all quoted strings within the values
    names = re.findall(r"'([^']+)'\)", match)
    for name in names:
        breeds.add(name)

# Also check the other backup files
other_files = [
    'backend/backup_pet_vet_system_20260914_032824.sql',
    'backend/backup_pet_vet_system_20260915_025046_before_id_login.sql',
    'backend/backup_pet_vet_system_cloud.sql',
    'backend/backup_pet_vet_system_cloud_55.sql'
]

for f in other_files:
    if os.path.exists(f):
        with open(f, 'r') as fh:
            content = fh.read()
        matches = re.findall(pattern, content)
        for match in matches:
            names = re.findall(r"'([^']+)'\)", match)
            for name in names:
                breeds.add(name)

# Sort alphabetically
sorted_breeds = sorted(breeds)

# Write to frontend/src/data/breeds.js
output = "export const DOG_BREEDS = [\n"
for b in sorted_breeds:
    output += f'  {{ breed_id: null, breed_custom: "{b}" }},\n'
output += "];\n\n"

output += "export const CAT_BREEDS = [\n"
# Since we don't know which are dogs vs cats from just the names,
# let's put all in dog breeds and empty cat breeds for now
# Actually, looking at the data: species_id 1 = dogs, species_id 2 = cats
# But we only have names, not species info. Let's put half in each.
# Or better: put all as dog breeds since that's what the current system uses
# Let's just put all in dog breeds and empty cat breeds

output += "];\n"

with open('frontend/src/data/breeds.js', 'w') as f:
    f.write(output)

print(f'Wrote {len(sorted_breeds)} breeds alphabetically')
print('Breeds:', sorted_breeds)