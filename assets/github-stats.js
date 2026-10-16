(() => {
  const username = "aarnavbhat23";
  const targets = {
    repositories: document.querySelector("[data-github-repos]"),
    followers: document.querySelector("[data-github-followers]"),
    stars: document.querySelector("[data-github-stars]"),
    updated: document.querySelector("[data-github-updated]"),
  };

  if (!targets.repositories) return;

  const setText = (node, value) => {
    if (node) node.textContent = value;
  };

  Promise.all([
    fetch(`https://api.github.com/users/${username}`, { headers: { Accept: "application/vnd.github+json" } }),
    fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`, { headers: { Accept: "application/vnd.github+json" } }),
  ])
    .then(async ([profileResponse, reposResponse]) => {
      if (!profileResponse.ok || !reposResponse.ok) throw new Error("GitHub profile data is unavailable");
      return [await profileResponse.json(), await reposResponse.json()];
    })
    .then(([profile, repositories]) => {
      const stars = repositories.reduce((sum, repository) => sum + (repository.stargazers_count || 0), 0);
      const newest = repositories
        .map((repository) => new Date(repository.updated_at))
        .filter((date) => !Number.isNaN(date.valueOf()))
        .sort((a, b) => b - a)[0];

      setText(targets.repositories, profile.public_repos ?? repositories.length);
      setText(targets.followers, profile.followers ?? "Public");
      setText(targets.stars, stars || "Open");
      setText(targets.updated, newest ? newest.toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "Live");
    })
    .catch(() => {
      setText(targets.updated, "Fallback");
    });
})();
