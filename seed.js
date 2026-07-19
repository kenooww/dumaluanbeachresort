require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Room = require('./models/Room');

async function seed() {
  await connectDB();

  const email = (process.env.ADMIN_EMAIL || 'admin@amihancove.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  const name = process.env.ADMIN_NAME || 'Resort Admin';

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`Admin account already exists: ${email}`);
  } else {
    await User.create({ name, email, password, role: 'admin' });
    console.log(`Created admin account -> email: ${email} / password: ${password}`);
    console.log('Please log in and change this password.');
  }

  const roomCount = await Room.countDocuments();
  if (roomCount === 0) {
    await Room.insertMany([
      {
        name: 'Sunrise Beachfront Bungalow',
        type: 'Beachfront Bungalow',
        description:
          'Wake up steps from the shoreline in a breezy, thatched-roof bungalow with a private hammock deck facing the sunrise.',
        pricePerNight: 189,
        capacity: 2,
        amenities: ['Ocean view', 'Private deck', 'Air conditioning', 'Free breakfast'],
        available: true,
      },
      {
        name: 'Lagoon Garden Villa',
        type: 'Garden Villa',
        description:
          'Tucked among palms and frangipani, this villa opens onto a private plunge pool with lagoon views.',
        pricePerNight: 249,
        capacity: 3,
        amenities: ['Private pool', 'Garden view', 'Outdoor shower', 'Mini bar'],
        available: true,
      },
      {
        name: 'Overwater Sunset Suite',
        type: 'Overwater Suite',
        description:
          'Perched above turquoise water, with a glass floor panel and a ladder down to the reef for an evening swim.',
        pricePerNight: 359,
        capacity: 2,
        amenities: ['Glass floor', 'Direct water access', 'Sunset view', 'Snorkel gear'],
        available: true,
      },
      {
        name: 'Palm Grove Family Cabana',
        type: 'Family Cabana',
        description:
          'Two connecting rooms and a shared veranda, built for family mornings and easy access to the kids’ cove.',
        pricePerNight: 279,
        capacity: 5,
        amenities: ['Connecting rooms', 'Kitchenette', 'Near kids’ cove', 'Free bike rentals'],
        available: true,
      },
    ]);
    console.log('Seeded 4 sample rooms.');
  } else {
    console.log(`Rooms already exist (${roomCount}) - skipped sample room seeding.`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
