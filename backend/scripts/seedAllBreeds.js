/**
 * Seeds the breeds table with a complete, alphabetized list of dog and cat
 * breeds. Idempotent: safe to re-run; existing breeds (matched by name,
 * case-insensitive) are never duplicated or renumbered, so pets that already
 * reference a breed_id keep working.
 *
 * Run from backend/:  node scripts/seedAllBreeds.js
 */
const db = require('../src/config/db');

const DOG_BREEDS = [
  'Airedale Terrier',
  'Akita',
  'Alaskan Malamute',
  'American Pit Bull Terrier',
  'American Staffordshire Terrier',
  'Australian Shepherd',
  'Basenji',
  'Basset Hound',
  'Beagle',
  'Belgian Malinois',
  'Bernese Mountain Dog',
  'Bloodhound',
  'Bluetick Coonhound',
  'Border Collie',
  'Border Terrier',
  'Boston Terrier',
  'Bull Terrier',
  'Cairn Terrier',
  'Cavalier King Charles Spaniel',
  'Chihuahua',
  'Chinese Crested',
  'Chow Chow',
  'Cocker Spaniel',
  'Collie',
  'Corgi (Cardigan)',
  'Corgi (Pembroke)',
  'Curly-Coated Retriever',
  'Dachshund',
  'Dandie Dinmont Terrier',
  'Doberman Pinscher',
  'English Cocker Spaniel',
  'English Foxhound',
  'English Springer Spaniel',
  'English Toy Spaniel',
  'Fila Brasileiro',
  'Finnish Lapphund',
  'French Bulldog',
  'German Shepherd',
  'German Shorthaired Pointer',
  'Giant Schnauzer',
  'Goldador',
  'Golden Retriever',
  'Goldendoodle',
  'Great Dane',
  'Greater Swiss Mountain Dog',
  'Havanese',
  'Irish Setter',
  'Irish Terrier',
  'Irish Wolfhound',
  'Italian Greyhound',
  'Japanese Chin',
  'Japanese Spitz',
  'Keeshond',
  'Labrador Retriever',
  'Lakeland Terrier',
  'Leonberger',
  'Maltese',
  'Mastiff',
  'Mexican Hairless',
  'Norwegian Buhund',
  'Norwegian Elkhound',
  'Norwegian Lundehund',
  'Old English Sheepdog',
  'Papillon',
  'Parson Russell Terrier',
  'Petit Basset Griffon Vend\u00e9en',
  'Pharaoh Hound',
  'Plott Hound',
  'Poodle (Miniature)',
  'Poodle (Standard)',
  'Poodle (Toy)',
  'Pug',
  'Puggle',
  'Rat Terrier',
  'Rhodesian Ridgeback',
  'Rottweiler',
  'Saint Bernard',
  'Samoyed',
  'Schnauzer (Giant)',
  'Schnauzer (Miniature)',
  'Schnauzer (Standard)',
  'Scottish Terrier',
  'Sealyham Terrier',
  'Shetland Sheepdog',
  'Shiba Inu',
  'Shih Tzu',
  'Skye Terrier',
  'Soft-Coated Wheaten Terrier',
  'Staffordshire Bull Terrier',
  'Swedish Vallhund',
  'Tibetan Mastiff',
  'Toy Fox Terrier',
  'Toy Poodle',
  'Treeing Tennessee Brindle',
  'Vizsla',
  'Weimaraner',
  'Welsh Terrier',
  'West Highland White Terrier',
  'Whippet',
  'Wirehaired Pointing Griffon',
  'Yorkshire Terrier',
];

const CAT_BREEDS = [
  'Abyssinian',
  'American Shorthair',
  'Balinese',
  'Bengal',
  'Birman',
  'British Shorthair',
  'Cornish Rex',
  'Devon Rex',
  'Egyptian Mau',
  'European Burmese',
  'Exotic Shorthair',
  'Japanese Bobtail',
  'Maine Coon',
  'Manx',
  'Norwegian Forest Cat',
  'Ocicat',
  'Oriental Shorthair',
  'Persian',
  'Ragdoll',
  'Russian Blue',
  'Savannah',
  'Scottish Fold',
  'Selkirk Rex',
  'Siamese',
  'Sphynx',
  'Turkish Angora',
  'Turkish Van',
  'York Chocolate',
];

async function main() {
  // 1. Read what is already there.
  const [existing] = await db.query('SELECT id, species_id, breed_name FROM breeds');
  const have = new Map();
  for (const row of existing) {
    have.set(row.breed_name.trim().toLowerCase(), row);
  }
  console.log(`Existing breeds: ${existing.length}`);

  // 2. Fold the legacy shorthand "Labrador" into "Labrador Retriever" so the
  //    dropdown does not show the same breed twice. The id is unchanged, so
  //    pets already linked to it keep their reference.
  const legacyLabrador = have.get('labrador');
  if (legacyLabrador && !have.has('labrador retriever')) {
    await db.query('UPDATE breeds SET breed_name = ? WHERE id = ?', [
      'Labrador Retriever',
      legacyLabrador.id,
    ]);
    have.delete('labrador');
    have.set('labrador retriever', { ...legacyLabrador, breed_name: 'Labrador Retriever' });
    console.log('Renamed legacy "Labrador" -> "Labrador Retriever" (id unchanged)');
  }

  // 3. Insert every missing breed with a fresh id.
  let nextId = existing.reduce((max, r) => Math.max(max, r.id), 0) + 1;
  let inserted = 0;

  async function insertMissing(names, speciesId) {
    for (const name of names) {
      if (have.has(name.toLowerCase())) continue;
      await db.query('INSERT INTO breeds (id, species_id, breed_name) VALUES (?, ?, ?)', [
        nextId,
        speciesId,
        name,
      ]);
      have.set(name.toLowerCase(), { id: nextId, species_id: speciesId, breed_name: name });
      nextId += 1;
      inserted += 1;
    }
  }

  await insertMissing(DOG_BREEDS, 1);
  await insertMissing(CAT_BREEDS, 2);
  console.log(`Inserted ${inserted} new breeds`);

  // 4. Verify the API query now returns a complete, alphabetical list.
  const [dogs] = await db.query(
    'SELECT * FROM breeds WHERE species_id = 1 ORDER BY breed_name ASC'
  );
  const [cats] = await db.query(
    'SELECT * FROM breeds WHERE species_id = 2 ORDER BY breed_name ASC'
  );

  const isSorted = (rows) =>
    rows.every((r, i) => i === 0 || rows[i - 1].breed_name.localeCompare(r.breed_name, 'en') <= 0);

  console.log(`Dogs: ${dogs.length} breeds, alphabetical: ${isSorted(dogs)}`);
  console.log(`Cats: ${cats.length} breeds, alphabetical: ${isSorted(cats)}`);
  console.log('First 5 dogs:', dogs.slice(0, 5).map((r) => r.breed_name).join(', '));
  console.log('First 5 cats:', cats.slice(0, 5).map((r) => r.breed_name).join(', '));
}

main()
  .then(() => db.end())
  .catch(async (err) => {
    console.error('Seed failed:', err);
    try { await db.end(); } catch (_) { /* ignore */ }
    process.exit(1);
  });
