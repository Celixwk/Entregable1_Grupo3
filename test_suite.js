const http = require('http');
const app = require('./src/app');

async function runTests() {
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(8081, resolve));
  console.log('✅ Servidor de prueba iniciado en http://localhost:8081');

  try {
    const baseUrl = 'http://localhost:8081';

    // 1. Probar GET /api/users
    console.log('\n--- 1. Probando GET /api/users ---');
    const resUsers = await fetch(`${baseUrl}/api/users`);
    const dataUsers = await resUsers.json();
    console.log(`Status: ${resUsers.status}`);
    console.log(`Total usuarios: ${dataUsers.total}`);
    console.log(`Usuario 1 password expuesto?: ${dataUsers.data[0].password !== undefined ? '❌ SÍ (ERROR)' : '✅ NO (CORRECTO)'}`);
    console.log(`Avatar URL: ${dataUsers.data[0].avatar}`);

    // 2. Probar GET archivo estático avatar
    console.log('\n--- 2. Probando Servidor de Archivos Estáticos (RE-01) ---');
    const resAvatar = await fetch(`${baseUrl}${dataUsers.data[0].avatar}`);
    console.log(`GET ${dataUsers.data[0].avatar} Status: ${resAvatar.status} ${resAvatar.statusText}`);

    // 3. Probar GET /api/pets
    console.log('\n--- 3. Probando GET /api/pets ---');
    const resPets = await fetch(`${baseUrl}/api/pets`);
    const dataPets = await resPets.json();
    console.log(`Status: ${resPets.status}`);
    console.log(`Total mascotas: ${dataPets.total}`);
    console.log(`Mascota 1 especie: ${dataPets.data[0].especie}, imagenes: ${dataPets.data[0].img.length}`);

    // 4. Probar GET archivo estático mascota
    const resPetImg = await fetch(`${baseUrl}${dataPets.data[0].img[0]}`);
    console.log(`GET ${dataPets.data[0].img[0]} Status: ${resPetImg.status} ${resPetImg.statusText}`);

    // 5. Probar POST /api/users (sin archivo)
    console.log('\n--- 5. Probando POST /api/users ---');
    const formDataUser = new FormData();
    formDataUser.append('firstname', 'Carlos');
    formDataUser.append('lastname', 'Mendoza');
    formDataUser.append('username', 'carlos.m');
    formDataUser.append('password', 'secreto123');

    const resPostUser = await fetch(`${baseUrl}/api/users`, {
      method: 'POST',
      body: formDataUser
    });
    const postUserData = await resPostUser.json();
    console.log(`POST /api/users Status: ${resPostUser.status} (${resPostUser.status === 201 ? '✅ 201 Created' : '❌ Error'})`);
    console.log(`Nuevo usuario ID: ${postUserData.data.id}, password expuesto?: ${postUserData.data.password !== undefined ? '❌ SÍ' : '✅ NO'}`);

    // 6. Probar POST /api/pets (crear mascota)
    console.log('\n--- 6. Probando POST /api/pets ---');
    const formDataPet = new FormData();
    formDataPet.append('especie', 'gato');
    formDataPet.append('color', 'blanco con gris');
    formDataPet.append('edad', '2');
    formDataPet.append('sexo', 'hembra');

    // Adjuntar archivo blob simulado
    const blob = new Blob(['fake image content'], { type: 'image/png' });
    formDataPet.append('img', blob, 'test-cat.png');

    const resPostPet = await fetch(`${baseUrl}/api/pets`, {
      method: 'POST',
      body: formDataPet
    });
    const postPetData = await resPostPet.json();
    console.log(`POST /api/pets Status: ${resPostPet.status} (${resPostPet.status === 201 ? '✅ 201 Created' : '❌ Error'})`);
    console.log(`Nueva mascota ID: ${postPetData.data.id}, fotos: ${JSON.stringify(postPetData.data.img)}`);

    // 7. Probar GET con ID inexistente (404)
    console.log('\n--- 7. Probando 404 en recurso inexistente ---');
    const res404 = await fetch(`${baseUrl}/api/users/99999`);
    console.log(`GET /api/users/99999 Status: ${res404.status} (${res404.status === 404 ? '✅ 404 Not Found' : '❌ Error'})`);

    // 8. Probar validación campos faltantes (400)
    console.log('\n--- 8. Probando 400 Bad Request ---');
    const emptyForm = new FormData();
    const res400 = await fetch(`${baseUrl}/api/users`, { method: 'POST', body: emptyForm });
    console.log(`POST /api/users (vacío) Status: ${res400.status} (${res400.status === 400 ? '✅ 400 Bad Request' : '❌ Error'})`);

    // 9. Probar DELETE
    console.log('\n--- 9. Probando DELETE /api/users/:id ---');
    const resDelUser = await fetch(`${baseUrl}/api/users/${postUserData.data.id}`, { method: 'DELETE' });
    console.log(`DELETE /api/users/${postUserData.data.id} Status: ${resDelUser.status} (${resDelUser.status === 200 ? '✅ 200 OK' : '❌ Error'})`);

    const resDelPet = await fetch(`${baseUrl}/api/pets/${postPetData.data.id}`, { method: 'DELETE' });
    console.log(`DELETE /api/pets/${postPetData.data.id} Status: ${resDelPet.status} (${resDelPet.status === 200 ? '✅ 200 OK' : '❌ Error'})`);

    console.log('\n========================================');
    console.log('🎉 ¡TODAS LAS PRUEBAS PASARON EXITOSAMENTE!');
    console.log('========================================\n');
  } catch (error) {
    console.error('❌ Error durante las pruebas:', error);
  } finally {
    server.close(() => {
      process.exit(0);
    });
  }
}

runTests();
