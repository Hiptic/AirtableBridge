function formatDate(date) {
  if (!date) {
    return null;
  }

  // const d = new Date(date);
  //`${d.getMonth() + 1}/${d.getDate()}/${d.getUTCFullYear()}`;
  return date.substr(0, 10);
}

function getAvatar(user) {
  return [{ url: user.avatar_url }];
}

function mapIssue(payload) {
  const {
    issue: {
      title,
      number,
      id,
      state,
      html_url,
      labels,
      created_at,
      updated_at,
      closed_at,
      user,
      body,
      assignees
    },
    repository
  } = payload;
  const labelNames = labels.map(label => label.name);
  const author = user.login;
  const Assignees = assignees.map(assignee => assignee.login);

  return {
    Title: title,
    ID: number,
    Open: state == "open",
    URL: html_url,
    Assignees,
    Description: body,
    Labels: labelNames,
    Author: author,
    Created: formatDate(created_at),
    Updated: formatDate(updated_at),
    Closed: formatDate(closed_at)
  };
}

function mapCommit(commit) {
  const { author: { login }, sha, commit: { message }, html_url } = commit;
  const committer = commit.committer.login;
  const date = commit.commit.committer ? commit.commit.committer.date : null;
  return {
    Author: login,
    Sha: sha,
    Message: message,
    Url: html_url,
    Committer: committer,
    Date: formatDate(date)
  };
}

function mapUser(user) {
  const { login, id, avatar_url, name, url } = user;
  return {
    Login: login,
    ID: id,
    Avatar: avatar_url,
    URL: url
  };
}

function mapLabel(label) {
  const {
    label: {
      id,
      url,
      name,
      color
    }
  } = label;

  return {
    ID: id,
    Name: name,
    Color: color,
    URL: url,
    Default: label.label.default
  };
}

function mapPR(pr) {
  const {
    html_url,
    number,
    state,
    title,
    created_at,
    updated_at,
    closed_at,
    merged_at,
    body,
    user,
    head
  } = pr;
  const Author = user.login;
  const Branch = head.label;
  return {
    ID: number,
    Url: html_url,
    Open: state == "open",
    Title: title,
    Created: formatDate(created_at),
    Updated: formatDate(updated_at),
    Closed: formatDate(closed_at),
    Merged: formatDate(merged_at),
    Description: body,
    Author,
    Avatar: getAvatar(user),
    Branch
  };
}

function mapPayload(table, payload) {
  const map = {
    Issues: mapIssue,
    Pulls: mapPR,
    Users: mapUser,
    Commits: mapCommit,
    Labels: mapLabel
  };

  const data = map[table](payload);
  return data;
}

module.exports = { mapIssue, mapCommit, mapUser, mapPR, mapPayload };
