// This is where we fetch the current licenses.json file
const fileRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
  headers: {
    Authorization: `Bearer ${token}`,  // The token stored in Vercel environment
    Accept: 'application/vnd.github+json',
  },
});

const fileData = await fileRes.json();

// Decoding the content from base64
let content = fileData.content ? Buffer.from(fileData.content, 'base64').toString('utf8') : '{}';
let json = JSON.parse(content);

// Add the new key for the email
json[email] = newKey;

// Encoding the updated content to base64 again
const newContent = Buffer.from(JSON.stringify(json, null, 2)).toString('base64');

// Commit the updated content back to GitHub
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
