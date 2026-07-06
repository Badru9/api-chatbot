import { auth } from './services/auth.js';

async function main() {
  console.log('Testing admin login...');
  try {
    const result = await auth.api.signInEmail({
      body: {
        email: 'admin@mb.ai',
        password: 'password123',
      },
    });
    console.log('Admin login success! Session details:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Admin login failed:', error);
  }

  console.log('Testing dosen login...');
  try {
    const result = await auth.api.signInEmail({
      body: {
        email: 'dosen@mb.ai',
        password: 'password123',
      },
    });
    console.log('Dosen login success! Session details:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Dosen login failed:', error);
  }
}

main().catch(console.error);
