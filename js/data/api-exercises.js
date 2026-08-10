/*
 * API Lab exercises.
 *
 * Each check() receives the method, the URL and the response, and decides
 * whether the learner did the thing — not whether they clicked a button. The
 * checks are deliberately strict about the parts interviews probe: the exact
 * status code, and the shape of the error rather than merely its presence.
 */
window.API_EXERCISES = [
  {
    task: "Fetch the user with id 1 and confirm the API returns 200 with that user's data.",
    hint: "GET /users/1",
    teaches: "The happy path. Note the response envelope — data plus metadata — and the x-request-id header, which is what you quote in a bug report so a developer can find the exact request in the logs.",
    nudge: "Send GET to /users/1 and look for a 200.",
    check: function (m, url, res) {
      return m === "GET" && /^\/users\/1$/.test(url.split("?")[0]) &&
             res.status === 200 && res.body && res.body.data && res.body.data.id === 1;
    }
  },
  {
    task: "Request a user that does not exist. What status should a well-behaved API return?",
    hint: "GET /users/9999",
    teaches: "404 with a documented error shape. The status alone is not the whole contract — assert the body too, or a 404 that returns an HTML error page passes your test.",
    nudge: "Try a numeric id nothing is using, like 9999. You are looking for 404, not 200-with-empty-data.",
    check: function (m, url, res) {
      return m === "GET" && /^\/users\/\d+$/.test(url.split("?")[0]) &&
             res.status === 404 && res.body && res.body.error && res.body.error.code === "not_found";
    }
  },
  {
    task: "Create a user, but leave out the email. Get the API to tell you exactly which field is wrong.",
    hint: 'POST /users with body {"name":"Test User"}',
    teaches: "422 for a well-formed request that fails validation, and the error names the field. 'Something went wrong' is not a contract — a client cannot highlight the right input from it.",
    nudge: "POST to /users with a name but no email. Look for 422 and an error naming the field.",
    check: function (m, url, res) {
      return m === "POST" && res.status === 422 &&
             res.body && res.body.error && res.body.error.field === "email";
    }
  },
  {
    task: "Register an email that already exists. This is not the same failure as the last one — find the status that says so.",
    hint: 'POST /users with an email already in the seeded data, e.g. ada@test.example',
    teaches: "409 Conflict. The request is perfectly valid; it collides with state. Sending 422 here would tell the client to fix the input when the input is fine — a distinction interviewers ask about directly.",
    nudge: "Use an email one of the seeded users already has. You want 409, not 422.",
    check: function (m, url, res) {
      return m === "POST" && res.status === 409 &&
             res.body && res.body.error && res.body.error.code === "conflict";
    }
  },
  {
    task: "Request the orders list without authenticating. Then do it again with the token.",
    hint: "GET /orders — first with the token checkbox off, then on",
    teaches: "401 means 'I do not know who you are', 403 would mean 'I know, and you still may not'. Also worth noticing: the orders list contains an order whose userId does not exist — an orphan, exactly the referential-integrity bug the SQL track teaches you to hunt.",
    nudge: "Send GET /orders with the token unchecked. You are looking for 401.",
    check: function (m, url, res) {
      return m === "GET" && /^\/orders$/.test(url.split("?")[0]) &&
             res.status === 401 && res.body && res.body.error.code === "unauthorized";
    }
  },
  {
    task: "Delete user 2. Then send exactly the same request again and note what changes.",
    hint: "DELETE /users/2, twice",
    teaches: "204 then 404. The state is identical after both calls — that is what idempotent means — but the responses differ, and that is fine. Retries happen when networks fail mid-request, so knowing which of your endpoints tolerate a repeat is a real answer to a real question.",
    nudge: "Send the DELETE a second time. The interesting response is the one you get on the repeat.",
    check: function (m, url, res) {
      return m === "DELETE" && /^\/users\/\d+$/.test(url.split("?")[0]) && res.status === 404;
    }
  }
];
