async function generateLicenseKey(email) {
  const response = await fetch('https://<your-vercel-url>/api', {  // Replace <your-vercel-url>
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  const result = await response.json();
  if (result.success) {
    console.log(`License generated for ${result.email}: ${result.newKey}`);
  } else {
    console.error('Error generating license:', result.error);
  }
}
