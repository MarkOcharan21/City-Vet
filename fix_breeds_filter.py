#!/usr/bin/env python3
# Fix the filteredBreeds logic in PetRegistration.jsx
# The issue: when form.species_id is '' (empty), the filter excludes all breeds
# Fix: show all breeds when species_id is empty, otherwise filter by species_id

with open('frontend/src/pages/owner/PetRegistration.jsx', 'r') as f:
    content = f.read()

# Replace the filteredBreeds logic
old_code = """  const filteredBreeds = breeds.filter(
    (b) => String(b.species_id) === String(form.species_id)
  );"""

new_code = """  const filteredBreeds = breeds.filter(
    (b) => !form.species_id || String(b.species_id) === String(form.species_id)
  );"""

if old_code in content:
    content = content.replace(old_code, new_code)
    with open('frontend/src/pages/owner/PetRegistration.jsx', 'w') as f:
        f.write(content)
    print('Fixed filteredBreeds logic')
else:
    print('Could not find old_code to replace')