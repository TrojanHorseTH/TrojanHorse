module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests allowed' });
  }

  const { email, key } = req.body;
  
  if (!email || !key) {
    return res.status(400).json({ error: 'Missing email or key' });
  }

  const token = process.env.GITHUB_PAT; // Store the GitHub token in Vercel env variables
  const repo = "TrojanHorseTH/TrojanHorse"; // Replace with your actual repo name
  const filePath = "licenses.json"; // Path to the file you want to update on GitHub

  try {
    // Fetch the existing licenses.json file from GitHub
    const fileRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json"
      }
    });

    const fileData = await fileRes.json();

    // Decode the base64 content of the existing file
    let content = fileData.content ? Buffer.from(fileData.content, "base64").toString("utf8") : "{}";
    let json = JSON.parse(content);

    // Add the new license to the JSON
    json[email] = key;

    // Encode the updated content back to base64
    const newContent = Buffer.from(JSON.stringify(json, null, 2)).toString("base64");

    // Commit the updated file back to GitHub
    const commitRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json"
      },
      body: JSON.stringify({
        message: `Add license for ${email}`,
        content: newContent,
        sha: fileData.sha
      })
    });

    if (!commitRes.ok) {
      return res.status(500).json({ error: 'Failed to update GitHub repository' });
    }

    return res.json({ success: true });

  } catch (error) {
    console.error("Error updating license:", error);
    return res.status(500).json({ error: 'Something went wrong while processing your request' });
  }
};
