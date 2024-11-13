import bcrypt from 'bcrypt';

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  console.log('Hashed password:', hashedPassword);
}

hashPassword('marusic');