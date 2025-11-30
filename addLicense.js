import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const { email, key } = req.body;

  if (!email || !key) {
    return res.status(400).json({ error: "Missing email or key" });
  }

  const token = process.env.GITHUB_PAT; // securely store the GitHub token
  const repo = "TrojanHorseTH/TrojanHorse"; // your repo name
  const filePath = "licenses.json"; // the file we are updating

  try {
    // Fetch the current licenses.json from GitHub
    const fileRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json"
      }
    });

    const fileData = await fileRes.json();

    // Decode the content from base64
    let content = fileData.content ? Buffer.from(fileData.content, "base64").toString("utf8") : "{}";
    let json = JSON.parse(content);

    // Add the new license
    json[email] = key;

    // Encode the new content back to base64
    const newContent = Buffer.from(JSON.stringify(json, null, 2)).toString("base64");

    // Commit the changes to GitHub
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
      return res.status(500).json({ error: "Failed to update GitHub repository" });
    }

    return res.json({ success: true });

  } catch (error) {
    console.error("Error updating license:", error);
    return res.status(500).json({ error: "Something went wrong" });
  }
}
