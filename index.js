module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Missing email' });
  }

  // Generate a new key for the email
  const newKey = generateKey();  

  const token = process.env.GITHUB_PAT;  // GitHub token from Vercel environment
  const repo = 'TrojanHorseTH/TrojanHorse';  // Replace with your GitHub repo
  const filePath = 'licenses.json';  // Path to the file you want to update

  try {
    const fileRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
    });

    const fileData = await fileRes.json();

    let content = fileData.content ? Buffer.from(fileData.content, 'base64').toString('utf8') : '{}';
    let json = JSON.parse(content);

    // Add the new key for the email
    json[email] = newKey;

    const newContent = Buffer.from(JSON.stringify(json, null, 2)).toString('base64');

    const commitRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
      body: JSON.stringify({
        message: `Add new license key for ${email}`,
        content: newContent,
        sha: fileData.sha,  // SHA of the current file to avoid conflicts
      }),
    });

    if (!commitRes.ok) {
      return res.status(500).json({ error: 'Failed to update GitHub repository' });
    }

    return res.json({ success: true, email, newKey });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Something went wrong' });
  }
};

// Simple key generation logic (you can customize this)
function generateKey() {
  // Generate a simple key for demo purposes. You can use a stronger method like UUID.
  return Math.random().toString(36).substring(2, 15);
}
