const { mappings } = require("../github");
const debug =  console.log;
const hankey = require("hankey");

async function removeDupes(airtable, table) {
  hankey.action(":gun: Removing duplicates");

  const records = await airtable(table)
    .select({
      view: table
    })
    .all();

  let ids = [];
  for (record of records) {
    const id = record._rawJson.fields.ID;
    if (ids.includes(id)) {
      try {
        await record.destroy();
        hankey.action(`:skull: Destroyed ${table} ${id}`);
      } catch (e) {
        debug(`Failed to destroy ${table} ${JSON.stringify(record._rawJson)}`);
      }
    } else {
      ids.push(id);
    }
  }
}

async function get(airtable, table, ID) {
  try {
    const records = await airtable(table)
      .select({
        filterByFormula: `{ID} = ${ID}`,
      })
      .all();

    if (records.length > 0) {
      debug(`Found record ${ID}`);
      return records[0].id;
    }
  } catch (e) {
    debug(`Did not find record ${ID}`);
    return null;
  }
}

async function getUserId(airtable, github, login) {
  try {
    const records = await airtable("Users")
      .select({
        filterByFormula: `{Login}="${login}"`,
        view: "Users"
      })
      .all();

    if (records.length > 0) {
      return records[0].id;
    }
  } catch (e) {
    debug(`failed to find user ${login} - ${e.message}`);
    return null;
  }
  try {
    const payload = await github.users.getForUser({ username: login });
    if (payload && payload.data) {
      const user = mappings.mapUser(payload.data);
      const response = await airtable("Users").create(user);
      if (response && response.id) {
        debug(`Created user ${login}`);
        return response.id;
      }
    }
  } catch (e) {
    debug(`failed to create user ${login} - ${e.message}`);
    return null;
  }
}

async function getUserIDs(airtable, github, users) {
  let userIds = [];
  for (const user of users) {
    const userId = await getUserId(airtable, github, user);
    userIds.push(userId);
  }
  return userIds.length > 0 ? userIds : null;
}

let failedRecords = [];

async function updateRecords(airtable, github, table, payloads) {
  debug(`# Records ${payloads.length}`);
  let failedRecords = [];
  let failureReasons = [];

  // await removeDupes(airtable, table);

  for (payload of payloads) {
    const response = await update(airtable, github, table, payload);
    if (response) {
      const { id, message } = response;
      failedRecords.push(id);
      if (failureReasons.filter(fmessage => fmessage == message).length == 0)
        failureReasons.push(message);
    }
  }

  debug(`Failed Records ${JSON.stringify(failedRecords)}`);
  debug(`Failure Reasons: ${JSON.stringify(failureReasons)}`);
}

function shouldIgnore(table, payload) {
  if (table == "Issues") {
    if (payload.issue.pull_request) {
      debug(
        `Skipping ${table} ${payload.issue.number} because it is a pull request`
      );
      return true;
    }
  }

  return;
}

async function update(airtable, github, table, payload) {
  let record;
  let data;
  try {
    if (shouldIgnore(table, payload)) {
      debug(`Skipping ${table} ${JSON.stringify(payload)}`);
      return;
    }

    data = mappings.mapPayload(table, payload);
    console.log(data)
    if (data.isPR) {
      return;
    }
    if (data.Author) {
      data.Author = [await getUserId(airtable, github, data.Author)];
    }

    if (data.Assignees) {
      data.Assignees = await getUserIDs(airtable, github, data.Assignees);
    }

    if (data.Labels) {
      const labels = await Promise.all(data.Labels.map(async label => {
        try {
          const records = await airtable("Labels")
            .select({
              filterByFormula: `{Name} = "${label}"`,
            })
            .all();

          if (records.length > 0) {
            debug(`Label record ${label}`);
            return records[0].id;
          }
        } catch (e) {
          debug(`Did not find label ${label}`);
          return;
        }
      }));
      data.Labels = labels
    }

    const recordId = await get(airtable, table, data.ID);

    if (recordId) {
      debug(`Updating ${table} record ${data.ID} ${data.Title}`);
      record = await airtable(table).update(recordId, data);
    } else {
      debug(`Creating ${table} record ${data.ID} ${data.Title}`);
      record = await airtable(table).create(data);
    }

    return null;
  } catch (e) {
    debug(
      `Failed to update ${table} record ${data &&
        data.ID} -  ${e.message} ${e.stack}`
    );
    return { id: data.ID, message: e.message };
  }

  return null;
}

async function create(airtable, table, payload) {
  let record;
  let data;
  try {
    data = mappings.mapPayload(table, payload);
    record = await airtable(table).create(data);
    return record;
  } catch (e) {
    debug(`Failed to create ${table} record ${data.ID} - ${e.message}`);
    return null;
  }
}

module.exports = { create, update, get, getUserId, updateRecords };
