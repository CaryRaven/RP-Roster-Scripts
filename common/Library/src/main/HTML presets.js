/**
 * Get the html page for the task manager
 * PARAMETERS: row, col, title, type
 * supported types: Postpone, Assign, Priority
 * @returns {String}
 */
function getHtmlTaskManager() {
  if (!isInit) throw new Error("Library is not yet initialized");

  try {
    return `
    <!DOCTYPE html>
    <html>

    <head>
      <!-- This page will be displayed if the user does not have authorization to open this admin menu -->
      <base target="_top">
      <link href='https://fonts.googleapis.com/css?family=Lexend' rel='stylesheet'>
      <style>
        body {
          background-color: whitesmoke;
          justify-content: center;
          text-align: center;
          font-family: Lexend;
        }

        @keyframes shake {
            0% {
            transform: translate(1px, 1px) rotate(0deg);
            }

            10% {
            transform: translate(-1px, -2px) rotate(-1deg);
            }

            20% {
            transform: translate(-3px, 0px) rotate(1deg);
            }

            30% {
            transform: translate(3px, 2px) rotate(0deg);
            }

            40% {
            transform: translate(1px, -1px) rotate(1deg);
            }

            50% {
            transform: translate(-1px, 2px) rotate(-1deg);
            }

            60% {
            transform: translate(-3px, 1px) rotate(0deg);
            }

            70% {
            transform: translate(3px, 1px) rotate(-1deg);
            }

            80% {
            transform: translate(-1px, -1px) rotate(1deg);
            }

            90% {
            transform: translate(1px, 2px) rotate(0deg);
            }

            100% {
            transform: translate(1px, -2px) rotate(-1deg);
            }
        }

        .shake {
            overflow: hidden;
            animation: shake 0.1s;
        }

        label {
          font-size: 23px;
          margin-top: 15px;
        }

        input,
        select,
        textarea {
          width: 100%;
          align-self: center;
          padding: 12px 20px;
          margin-bottom: 40px;
          box-sizing: border-box;
          border: 4px solid #111111;
          box-shadow: 0 0.3rem 0.4rem #111111;
          border-radius: 10px;
          -webkit-transition: 0.5s;
          transition: 0.5s;
          background-color: #444444;
          color: #fff;
          outline: none;
          text-align: center;
        }

        input:hover,
        select:hover,
        textarea:hover {
          border: 4px solid #ccc;
        }

        input:focus,
        select:focus,
        textarea:focus {
          border: 4px solid #ccc;
          background-color: #222222;
        }

        input:invalid,
        select:invalid,
        textarea:invalid {
          border: 4px solid #8B0000;
        }

        input:invalid:focus,
        select:invalid:focus,
        textarea:invalid:focus,
        input:invalid:hover,
        select:invalid:hover,
        textarea:invalid:hover {
          border: 4px solid red;
        }

        p {
          font-size: 15px;
        }

        #description {
          height: 4rem;
          text-align: left;
          justify-content: top;
          word-wrap: break-word;
          resize: none;
          text-align: left;
        }

        .submitButton {
            background-color: #4a4a4a;
            color: whitesmoke;
            text-align: center;
            align-self: center;
            border-radius: 20px;
            box-shadow: 0 0.3rem 0.4rem #111111;
            width: 45%;
            padding: 20px 20px;
            font-size: 20px;
            border: 4px solid #111111;
            transition: 0.5s ease;
            overflow: hidden;
        }

        .submitButton:hover {
            background-color: #222222;
            transition: 0.5s ease;
            cursor: pointer;
        }

        .submitButton:disabled {
            background-color: #4a4a4a;
            color: gray;
            cursor: not-allowed;
        }

        .loader {
            border: 16px solid #666666;
            border-top: 16px solid black;
            border-radius: 50%;
            width: 25px;
            height: 25px;
            animation: spin 1.2s linear infinite;
            justify-self: center;
        }

        @keyframes spin {
            0% {
            transform: rotate(0deg);
            }

            100% {
            transform: rotate(360deg);
            }
        }

        .red {
            background-color: red !important;
            color: black !important;
        }

        .green {
            background-color: green !important;
            color: black !important;
        }
      </style>
      <script>
        document.addEventListener("DOMContentLoaded", function() {
          window.SubmitNewDeadline = function(event) {
            event.preventDefault();
            const deadline = document.getElementById("deadline").value;
            const button = document.getElementById("postponeButton");
            const rowElement = document.getElementById("row");
            const colElement = document.getElementById("col");

            // Check if the elements exist before accessing their innerText
            if (!rowElement || !colElement) {
              console.error("Row or column element not found!");
              return;
            }

            let row = rowElement.innerText;
            let col = colElement.innerText;

            if (!deadline || !row || !col) {
              document.body.classList.add("shake");
              setTimeout(() => {
                document.body.classList.remove("shake");
              }, 100);
              console.error("Invalid arguments");
              return;
            };
            button.disabled = true;
            button.innerHTML = '<div class="loader"></div>';

            const data = {
              deadline: deadline,
              row: row,
              col: col
            };

            google.script.run
              .withSuccessHandler(response => {
                if (response) {
                  button.innerText = response;
                  if (response.includes("Postponed")) {
                    button.classList.add("green");
                  } else {
                    button.classList.add("red");
                  }
                  setTimeout(() => {
                    button.disabled = false;
                    if (response.includes("Postponed")) {
                      button.classList.remove("green");
                    } else {
                      button.classList.remove("red");
                    }
                    google.script.host.close();
                  }, 2000);
                }
              })
              .withFailureHandler(() => {
                button.innerText = "Something went wrong";
                document.body.classList.add("shake");
                setTimeout(() => {
                  document.body.classList.remove("shake");
                }, 100);
                setTimeout(() => {
                  button.disabled = false;
                  button.innerHTML = "";
                  button.innerText = "Submit";
                }, 2000);
              })
              .ChangeDeadline(data);
          };

          window.SubmitAssignment = function(event) {
            event.preventDefault();
            const gmail = document.getElementById("gmail").value;
            const button = document.getElementById("assignButton");
            const rowElement = document.getElementById("row");
            const colElement = document.getElementById("col");
            const titleElement = document.getElementById("title");

            // Check if the elements exist before accessing their innerText
            if (!rowElement || !colElement || !titleElement) {
              console.error("Row or column element not found!");
              return;
            }

            let row = rowElement.innerText;
            let col = colElement.innerText;
            let title = titleElement.innerText;

            if (!gmail || !row || !col) {
              document.body.classList.add("shake");
              setTimeout(() => {
                document.body.classList.remove("shake");
              }, 100);
              console.error("Invalid arguments");
              return;
            };
            button.disabled = true;
            button.innerHTML = '<div class="loader"></div>';

            const data = {
              gmail: gmail,
              row: row,
              col: col,
              title: title
            };

            google.script.run
              .withSuccessHandler(response => {
                if (response) {
                  button.innerText = response;
                  if (response.includes("Assigned")) {
                    button.classList.add("green");
                  } else {
                    button.classList.add("red");
                  }
                  setTimeout(() => {
                    button.disabled = false;
                    if (response.includes("Assigned")) {
                      button.classList.remove("green");
                    } else {
                      button.classList.remove("red");
                    }
                    google.script.host.close();
                  }, 2000);
                } else {
                  button.innerText = "No response from server";
                  button.classList.add("red");
                  setTimeout(() => {
                    button.classList.remove("red");
                    button.innerText = "Assign";
                  }, 2000);
                }
              })
              .withFailureHandler(() => {
                button.innerText = "Something went wrong";
                document.body.classList.add("shake");
                setTimeout(() => {
                  document.body.classList.remove("shake");
                }, 100);
                setTimeout(() => {
                  button.disabled = false;
                  button.innerHTML = "";
                  button.innerText = "Submit";
                }, 2000);
              })
              .ChangeAssignment(data);
          };

          window.SubmitPriority = function(event) {
            event.preventDefault();
            const priority = document.getElementById("priority").value;
            const button = document.getElementById("assignButton");
            const rowElement = document.getElementById("row");
            const colElement = document.getElementById("col");
            const titleElement = document.getElementById("title");

            // Check if the elements exist before accessing their innerText
            if (!rowElement || !colElement || !titleElement) {
              console.error("Row or column element not found!");
              return;
            }

            let row = rowElement.innerText;
            let col = colElement.innerText;
            let title = titleElement.innerText;

            if (!priority || !row || !col) {
              document.body.classList.add("shake");
              setTimeout(() => {
                document.body.classList.remove("shake");
              }, 100);
              console.error("Invalid arguments");
              return;
            };
            button.disabled = true;
            button.innerHTML = '<div class="loader"></div>';

            const data = {
              priority: priority,
              row: row,
              col: col,
              title: title
            };

            google.script.run
              .withSuccessHandler(response => {
                if (response) {
                  button.innerText = response;
                  if (response.includes("Edited")) {
                    button.classList.add("green");
                  } else {
                    button.classList.add("red");
                  }
                  setTimeout(() => {
                    button.disabled = false;
                    if (response.includes("Edited")) {
                      button.classList.remove("green");
                    } else {
                      button.classList.remove("red");
                    }
                    google.script.host.close();
                  }, 2000);
                }
              })
              .withFailureHandler(() => {
                button.innerText = "Something went wrong";
                document.body.classList.add("shake");
                setTimeout(() => {
                  document.body.classList.remove("shake");
                }, 100);
                setTimeout(() => {
                  button.disabled = false;
                  button.innerHTML = "";
                  button.innerText = "Submit";
                }, 2000);
              })
              .ChangePriority(data);
          };

          let emailList = document.getElementById("emails").innerText;
          const gmailSelect = document.getElementById("gmail");
          emailList = emailList.split(",");

          for (email of emailList) {
            const emailOption = document.createElement("option");
            emailOption.value = email;
            emailOption.innerText = email;
            gmailSelect.appendChild(emailOption);
          }
        });
      </script>
    </head>

    <body>
      <? if (type == "Postpone") { ?>
        <h1>Postpone this task</h1>
        <p>Fill out all of the below questions in order to edit the deadline for this task.</p>
        <hr>
        <form>
          <label for="deadline">New Deadline:</label>
          <input type="date" id="deadline" placeholder="Select a new deadline for the task" required>
          <button onclick="SubmitNewDeadline(event)" type="submit" class="submitButton" id="postponeButton">Submit</button>
        </form>
      <? } else if (type == "Assign") { ?>
        <h1>Assign</h1>
        <p>Fill out all of the below questions in order to assign or unassign a member to this task.<br>
        If the assigned member was to be removed, they will be unassigned automatically.<br>
        If the task would not be completed by the deadline, all assigned members will receive a "normal" infraction.</p>
        <hr>
        <form>
          <label for="gmail">Gmail address of person to assign:</label>
          <select id="gmail" required>
          </select>
          <button onclick="SubmitAssignment(event)" type="submit" class="submitButton" id="assignButton">Submit</button>
        </form>
      <? } else if (type == "Priority") { ?>
        <h1>Change Priority</h1>
        <p>Fill out all of the below questions in order to change the priority level of this task.</p>
        <hr>
        <form>
          <label for="priority">Select new priority level:</label>
          <select id="priority" required>
            <option value=""></option>
            <option value="Low Priority">Low Priority</option>
            <option value="Medium Priority">Medium Priority</option>
            <option value="High Priority">High Priority</option>
            <option value="Urgent">Urgent</option>
          </select>
          <button onclick="SubmitPriority(event)" type="submit" class="submitButton" id="assignButton">Submit</button>
        </form>
      <? } ?>
      <p style="font-size: 0px;" id="row"><?= row ?></p>
      <p style="font-size: 0px;" id="col"><?= col ?></p>
      <p style="font-size: 0px;" id="title"><?= title ?></p>
      <p style="font-size: 0px;" id="emails"><?= emails ?></p>
    </body>

    </html>`;
  } catch(e) {
    sendDiscordError(e.toString(), "getHtmlTaskManager")
  }
}

/**
 * Get the html page for creating a new task
 * NO PARAMETERS
 * @returns {String}
 */
function getHtmlAddTask() {
  if (!isInit) throw new Error("Library is not yet initialized");

  return `
  <!DOCTYPE html>
<html>

<head>
  <!-- This page will be displayed if the user does not have authorization to open this admin menu -->
  <base target="_top">
  <link href='https://fonts.googleapis.com/css?family=Lexend' rel='stylesheet'>
  <style>
    body {
      background-color: whitesmoke;
      justify-content: center;
      text-align: center;
      font-family: Lexend;
    }

    @keyframes shake {
        0% {
        transform: translate(1px, 1px) rotate(0deg);
        }

        10% {
        transform: translate(-1px, -2px) rotate(-1deg);
        }

        20% {
        transform: translate(-3px, 0px) rotate(1deg);
        }

        30% {
        transform: translate(3px, 2px) rotate(0deg);
        }

        40% {
        transform: translate(1px, -1px) rotate(1deg);
        }

        50% {
        transform: translate(-1px, 2px) rotate(-1deg);
        }

        60% {
        transform: translate(-3px, 1px) rotate(0deg);
        }

        70% {
        transform: translate(3px, 1px) rotate(-1deg);
        }

        80% {
        transform: translate(-1px, -1px) rotate(1deg);
        }

        90% {
        transform: translate(1px, 2px) rotate(0deg);
        }

        100% {
        transform: translate(1px, -2px) rotate(-1deg);
        }
    }

    .shake {
        overflow: hidden;
        animation: shake 0.1s;
    }

    label {
      font-size: 23px;
      margin-top: 15px;
    }

    input,
    select,
    textarea {
      width: 100%;
      align-self: center;
      padding: 12px 20px;
      margin-bottom: 40px;
      box-sizing: border-box;
      border: 4px solid #111111;
      box-shadow: 0 0.3rem 0.4rem #111111;
      border-radius: 10px;
      -webkit-transition: 0.5s;
      transition: 0.5s;
      background-color: #444444;
      color: #fff;
      outline: none;
      text-align: center;
    }

    input:hover,
    select:hover,
    textarea:hover {
      border: 4px solid #ccc;
    }

    input:focus,
    select:focus,
    textarea:focus {
      border: 4px solid #ccc;
      background-color: #222222;
    }

    input:invalid,
    select:invalid,
    textarea:invalid {
      border: 4px solid #8B0000;
    }

    input:invalid:focus,
    select:invalid:focus,
    textarea:invalid:focus,
    input:invalid:hover,
    select:invalid:hover,
    textarea:invalid:hover {
      border: 4px solid red;
    }

    p {
      font-size: 15px;
    }

    #description {
      height: 4rem;
      text-align: left;
      justify-content: top;
      word-wrap: break-word;
      resize: none;
      text-align: left;
    }

    .submitButton {
        background-color: #4a4a4a;
        color: whitesmoke;
        text-align: center;
        align-self: center;
        border-radius: 20px;
        box-shadow: 0 0.3rem 0.4rem #111111;
        width: 45%;
        padding: 20px 20px;
        font-size: 20px;
        border: 4px solid #111111;
        transition: 0.5s ease;
        overflow: hidden;
    }

    .submitButton:hover {
        background-color: #222222;
        transition: 0.5s ease;
        cursor: pointer;
    }

    .submitButton:disabled {
        background-color: #4a4a4a;
        color: gray;
        cursor: not-allowed;
    }

    .loader {
        border: 16px solid #666666;
        border-top: 16px solid black;
        border-radius: 50%;
        width: 25px;
        height: 25px;
        animation: spin 1.2s linear infinite;
        justify-self: center;
    }

    @keyframes spin {
        0% {
        transform: rotate(0deg);
        }

        100% {
        transform: rotate(360deg);
        }
    }

    .red {
        background-color: red !important;
        color: black !important;
    }

    .green {
        background-color: green !important;
        color: black !important;
    }
  </style>
  <script>
    function Submit(event) {
      event.preventDefault();
      const title = document.getElementById("title").value;
      const description = document.getElementById("description").value;
      const deadline = document.getElementById("deadline").value;
      const priority = document.getElementById("priority").value;
      const button = document.getElementById("taskButton");

      if (!title || !description || !deadline || description.length > 1500 || !priority) {
        document.body.classList.add("shake");
        setTimeout(() => {
          document.body.classList.remove("shake");
        }, 100);
        return;
      };
      button.disabled = true;
      button.innerHTML = '<div class="loader"></div>';

      const data = {
        title: title,
        description: description,
        deadline: deadline,
        priority: priority
      }
      google.script.run.withSuccessHandler(response => {
        if (response) {
          button.innerText = response;
          if (response.includes("Added")) {
            button.classList.add("green");
          } else {
            button.classList.add("red");
          }
          setTimeout(() => {
            button.disabled = false;
            if (response.includes("Added")) {
              button.classList.remove("green");
              google.script.host.close();
            } else {
              button.classList.remove("red");
            }
          }, 2000);
        }
      }).withFailureHandler(() => {
        button.innerText = "Something went wrong";
        document.body.classList.add("shake");
        setTimeout(() => {
          document.body.classList.remove("shake");
        }, 100);
        setTimeout(() => {
            button.disabled = false;
            button.innerHTML = "";
            button.innerText = "Submit";
          }, 2000);
      }).SubmitTask(data);
    }
  </script>
</head>

<body>
  <h1>Add a Task</h1>
  <p>Fill out all of the below questions in order to add a task to the backlog.</p>
  <hr>
  <form>
    <label for="title">Title:</label>
    <input type="text" id="title" placeholder="Add a title to your task" maxlength="25" required>
    <label for="description">Description:</label>
    <textarea type="message" id="description" placeholder="Add a description to your task" maxlength="1500" required></textarea>
    <label for="deadline">Deadline:</label>
    <input type="date" id="deadline" placeholder="Select a deadline for the task" required>
    <label for="priority">Select a Priority Level:</label>
    <select id="priority" required>
      <option value=""></option>
      <option value="Low Priority">Low Priority</option>
      <option value="Medium Priority">Medium Priority</option>
      <option value="High Priority">High Priority</option>
      <option value="Urgent">Urgent</option>
    </select>
    <button onclick="Submit(event)" type="submit" class="submitButton" id="taskButton">Submit</button>
  </form>
</body>

</html>`
}

/**
 * Gets the futuristic into animation
 * Required Params = name, rank
 * @returns {String}
 */
function getHtmlTerminalAnimation() {
  if (!isInit) throw new Error("Library is not yet initialized");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Animated Page</title>
    <style>
        body {
            background-color: black;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            overflow: hidden;
        }

        .container {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            position: relative;
            width: 100%;
        }

        #animatedImage {
            width: 36vw;
            height: 20vw;
            opacity: 0;
            position: fixed;
            top: 13%;
        }

        #textImage {
            width: 26vw;
            height: 18vw;
            opacity: 0;
            position: fixed;
            top: 15%;
            transform: translateX(15vw);
            z-index: 2;
            display: none;
        }

        .anim {
            animation: fadeInMove 3s ease-in-out forwards;
        }

        .fadeIn {
            animation: fadeIn 2s ease-in-out forwards;
        }

        @keyframes fadeInMove {
            0% { opacity: 0; transform: translateX(0); }
            30% { opacity: 0.5; }
            60% { opacity: 1; transform: translateX(-15vw); }
            100% { transform: translateX(-15vw); }
        }

        @keyframes fadeIn {
            0% { opacity: 0; }
            100% { opacity: 1; }
        }

        @keyframes fadeOut {
            0% { opacity: 1; }
            100% { opacity: 0; }
        }

        /* Input Container */
        .input-container {
            margin-top: 10vh;
            position: relative;
            display: inline-block;
            z-index: 10;
            flex-direction: column;
            align-items: center;
            padding-top: 150px;
            opacity: 0;
        }

        /* Individual Input Styles */
        .input-box {
            transform: translateY(13vh);
            z-index: 1;
            position: relative;
        }

        input {
            width: 400px;
            height: 100px;
            font-size: 22px;
            z-index: 5;
            font-family: monospace;
            text-align: center;
            color: whitesmoke;
            background: transparent;
            border: none;
            outline: none;
            opacity: 0;
            pointer-events: none;
        }

        p {
          height: auto;
          padding: 0;
          line-height: 300%;
          width: 400px;
          font-size: 22px;
          z-index: 5;
          font-family: monospace;
          text-align: center;
          color: whitesmoke;
          background: transparent;
          border: none;
          outline: none;
          opacity: 0;
        }

        /* Each input gets its own borders */
        .border-effect {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 4;
          pointer-events: none; /* make sure it doesn't block input */

          /* Add these lines */
          display: flex;
          justify-content: center; /* horizontal center */
          align-items: center;    /* vertical center */
      }

        .border-top, .border-bottom {
            position: absolute;
            width: 0%;
            height: 3px;
            background: whitesmoke;
        }

        .border-top {
            top: 0;
            left: 0;
            animation: drawBorderTop 1s forwards, flicker 0.5s ease-in-out 1.5s 2;
        }

        .border-bottom {
            bottom: 0;
            right: 0;
            animation: drawBorderBottom 1s 0.5s forwards, flicker 0.3s ease-in-out 1.5s 2;
        }

        .border-left, .border-right {
            position: absolute;
            width: 2px;
            height: 0%;
            background: whitesmoke;
        }

        .border-left {
            top: 0;
            left: 0;
            animation: drawBorderLeft 1s 1s forwards, flicker 0.2s ease-in-out 1.5s 2;
        }

        .border-right {
            top: 0;
            right: 0;
            animation: drawBorderRight 1s 1.5s forwards, flicker 0.8s ease-in-out 1.5s 2;
        }

        @keyframes drawBorderTop {
            from { width: 10%; }
            to { width: 100%; }
        }

        @keyframes drawBorderBottom {
            from { width: 10%; }
            to { width: 100%; }
        }

        @keyframes drawBorderLeft {
            from { height: 10%; }
            to { height: 100%; }
        }

        @keyframes drawBorderRight {
            from { height: 10%; }
            to { height: 100%; }
        }

        @keyframes flicker {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
        }

        /* Enable Input */
        .input-container.show input {
            animation: revealInput 0.5s 2.5s forwards;
        }

        @keyframes revealInput {
            to {
                opacity: 1;
                pointer-events: auto;
            }
        }

        /* Show the input container */
        .input-container.show {
            animation: fadeIn 1s ease-in-out forwards;
            opacity: 1;
        }

        .input-container.hide {
            animation: fadeOut 1s ease-in-out forwards;
            opacity: 0;
        }

        .input-container.show p {
          padding: 20px;
          animation: revealInput 0.5s 2.5s forwards;
        }

        #inputContainer {
          display: none;
        }
    </style>
</head>
<body>

    <div class="container">
        <img id="animatedImage" src="" alt="Background">
        <img id="textImage" src="" alt="text">
        
        <!-- Input fields below -->
        <div class="input-container" id="loadingContainer">
            <div class="input-box">
                <p id="quotefield"></p>
                <div class="border-effect">
                    <div id="bt3"></div>
                    <div id="bb3"></div>
                    <div id="bl3"></div>
                    <div id="br3"></div>
                </div>
            </div>
            <br>
            <div class="input-box">
                <p id="loadingInput">Loading...</p>
                <div class="border-effect">
                    <div id="bt4"></div>
                    <div id="bb4"></div>
                    <div id="bl4"></div>
                    <div id="br4"></div>
                </div>
            </div>
        </div>
        <div class="input-container" id="inputContainer">
            <div class="input-box">
                <input type="text" placeholder="Enter your name..." id="namefield">
                <div class="border-effect">
                    <div id="bt"></div>
                    <div id="bb"></div>
                    <div id="bl"></div>
                    <div id="br"></div>
                </div>
            </div>
            <br>
            <div class="input-box">
                <input type="password" placeholder="Enter your 5-digit code..." id="passfield" maxlength="5">
                <div class="border-effect">
                    <div id="bt2"></div>
                    <div id="bb2"></div>
                    <div id="bl2"></div>
                    <div id="br2"></div>
                </div>
            </div>
        </div>
        <p style="font-size: 0px;" id="name"><?= name; ?></p>
        <p style="font-size: 0px;" id="rank"><?= rank; ?></p>
    </div>

    <script>
        google.script.run
            .withSuccessHandler(function(bytes) {
                showImage(bytes, "animatedImage");
                google.script.run.withSuccessHandler(bytes2 => {
                    showImage(bytes2, "textImage");
                    let image = document.getElementById("animatedImage");
                    let textImage = document.getElementById("textImage");
                    let loadingContiner = document.getElementById("loadingContainer");
                    let inputContainer = document.getElementById("inputContainer");

                    image.classList.add("anim");
                    image.style.opacity = "1";

                    setTimeout(() => {
                      textImage.style.display = "block";
                      textImage.classList.add("fadeIn");

                      setTimeout(() => {
                        loadingContainer.classList.add("show");

                        let loadingTexts = [
                          "",
                          "Booting system...",
                          "Fetching Assets...",
                          "Established secure connection",
                          "// Finished Loading //",
                        ];

                        const quotes = [
                          "[REDACTED]",
                          "Who's that behind you?",
                          "Ethics? I hardly even know her!",
                          "We live in the light so you can die in the dark",
                          "Do you dream about cheese?",
                          "D does NOT stand for disposable",
                          "Is the council real?",
                          "The more you know, the less you want to know",
                          "Insurance does not cover any damages beyond this point",
                          "Choice is a poisoned chalice",
                          "Take a selfie with O96"
                        ];

                        const index = Math.round(Math.random() * 10);
                        document.getElementById("quotefield").innerText = quotes[index];

                        let currentTextIndex = 0; // Keep track of the current string

                        function typeText(text, element, index = 0) {
                          if (index < text.length) {
                            let char = text.charAt(index);
                            if (char === " ") {
                              char = "&nbsp;"; // Replace space with non-breaking space
                            }
                            element.innerHTML += char; // Use innerHTML
                            setTimeout(() => typeText(text, element, index + 1), 50); // Adjust typing speed here
                          } else {
                            // Move to the next string when typing is complete
                            currentTextIndex++;
                            if (currentTextIndex < loadingTexts.length) {
                              setTimeout(() => {
                                element.innerHTML = ""; // Clear the input for the next string (use innerHTML)
                                typeText(loadingTexts[currentTextIndex], element);
                              }, 1000); // Pause before the next string starts
                            }
                          }
                        }

                        // Start the typing effect with the first string
                        setTimeout(() => {
                          typeText(loadingTexts[0], document.getElementById("loadingInput"));

                          setTimeout(() => {
                            loadingContainer.style.display = "none";
                            inputContainer.style.display = "block";
                            inputContainer.classList.add("show");
                            loadingContainer.classList.add("hide");
                            loadingContainer.classList.remove("show");
                            document.getElementById("bt").classList.add("border-top");
                            document.getElementById("bb").classList.add("border-bottom");
                            document.getElementById("bl").classList.add("border-left");
                            document.getElementById("br").classList.add("border-right");

                            setTimeout(() => {
                              document.getElementById("bt2").classList.add("border-top");
                              document.getElementById("bb2").classList.add("border-bottom");
                              document.getElementById("bl2").classList.add("border-left");
                              document.getElementById("br2").classList.add("border-right");
                            }, 600);

                            const name = document.getElementById("name").innerText;
                            const rank = document.getElementById("rank").innerText;

                            document.getElementById("passfield").addEventListener("input", () => {
                              const pass = document.getElementById("passfield").value;
                              const inputname = document.getElementById("namefield").value.trim();

                              if (pass.length != 5 || inputname.length < 2) return;

                              if (inputname.toLowerCase().includes(name.toLowerCase()) || name.includes("N/A")) {
                                google.script.run.withSuccessHandler(url => {
                                  window.top.location.href = url.toString();
                                }).GetScriptUrl();
                              }
                            });

                            document.getElementById("namefield").addEventListener("input", () => {
                              const pass = document.getElementById("passfield").value;
                              const inputname = document.getElementById("namefield").value.trim();

                              if (pass.length != 5 || inputname.length < 2) return;

                              if (inputname.toLowerCase().includes(name.toLowerCase()) || name.includes("N/A")) {
                                google.script.run.withSuccessHandler(url => {
                                  window.top.location.href = url.toString();
                                }).GetScriptUrl();
                              }
                            });
                          }, 9500);
                        }, 3000);
                      }, 500);
                    }, 2000);

                }).loadImageBytes("1TPsBLuB_u80EGPu_Ro07tNMXLm9kkfJq");
            })
            .loadImageBytes("19qQCAdTJ9rjjpf3h89-8QzacoUIfamWx");

        function showImage(bytes, id) {
            document.getElementById(id).src = "data:image/png;base64," + bytes;
        }
    </script>

</body>
</html>`
}

/**
 * Gets the retro style terminal animations (currently only used for lockdown & unauthed)
 * Required Params: type, rank, name, factionName
 * @returns {String}
 */
function getHtmlRetroTerminal() {
  if (!isInit) throw new Error("Library is not yet initialized");

  return `
  <!DOCTYPE html>
<html>
<head>
  <title>Typing Effect Terminal</title>
  <style>
    * {
      font-size: 24px;
    }
    
    body {
      font-family: monospace;
      background-color: black;
      color: green;
      padding: 20px;
      max-height: 90vh;
      overflow-y: auto;
      display: block;
    }

    input {
      background: black;
      color: green;
      border: none;
      font-family: monospace;
      outline: none;
    }

    @keyframes glitch {
      0% { transform: translate(0, 0); filter: hue-rotate(0deg); }
      20% { transform: translate(-2px, 2px); filter: hue-rotate(20deg); }
      40% { transform: translate(2px, -2px); filter: hue-rotate(-20deg); }
      60% { transform: translate(-1px, 1px); filter: hue-rotate(10deg); }
      80% { transform: translate(1px, -1px); filter: hue-rotate(-10deg); }
      100% { transform: translate(0, 0); filter: hue-rotate(0deg); }
    }

    .glitch-effect {
      animation: glitch 0.1s infinite;
    }

    .glitch-text {
      display: inline-block;
      position: relative;
    }

    .glitch-text::before,
    .glitch-text::after {
      content: attr(data-text);
      position: absolute;
      left: 0;
      opacity: 0.8;
    }

    .glitch-text::before {
      color: red;
      transform: translate(-2px, -1px);
      clip-path: inset(20% 0 30% 0);
    }

    .glitch-text::after {
      color: blue;
      transform: translate(2px, 1px);
      clip-path: inset(40% 0 10% 0);
    }

    #redirectButton {
      background-color: black;
      border: solid green 2px;
      color: green;
      z-inex: 2;
      position: fixed;
      bottom: 10px;
    }

    #redirectButton:hover {
      border: solid #66FF99 3px;
      color: #66FF99;
    }
  </style>
  <script>
    document.addEventListener("DOMContentLoaded", function () {
      const rank = document.getElementById("rank").innerText;
      const factionName = document.getElementById("factionName").innerText;
      const type = document.getElementById("type").innerText;
      const userName = document.getElementById("name").innerText;
      let lines;

      switch (type) {
        case "first": // NOT USED -> replaced by modern terminal imported from lib
          lines = [
            "Booting terminal...",
            "Loading system env...",
            "Established secure connection to host << all systems online",
            "Enter your name and press enter to continue operation:",
            "Analyzing fingerprint and database matches...                 ",
            "Enter your 5-digit password:",
            "Processing...                ",
            "Access granted. Welcome, " + rank + ".",
            " ",
            "Closing secure connection, please stand by                            ",
            "Press [redirect] to connect to the " + factionName + " Admin Menu...<br><br>",
            " ",
            ">> Loading application: 8%",
            ">> Loading application: 23%",
            ">> Loading application: 31%",
            ">> Loading application: 38%",
            ">> Loading application: 45%",
            ">> Loading application: 47%",
            ">> Loading application: 48%",
            "<!> Loading application: [DATA EXPUNGED]",
            ">> Loading application: 71%",
            ">> Loading application: 79%",
            ">> Loading application: 84%",
            ">> Loading application: 97%",
            "Finished Loading",
          ];
          break;
        case "lockdown":
          lines = [
            "Booting terminal <#emergency mode>...", 
            "Loading system env...",
            "Established secure connection to host << all systems online",
            "             ",
            "Fetching message...                ",
            "",
            "Dear " + rank + ",",
            factionName + " documentation is currently undergoing a lockdown, we apologise for the inconvenience.",
            "",
            "Please wait while the cause is being invesitaged, you will be notified over discord once the situation is resolved.",
            "Thank you for your patience.",
            "  ",
            "Kind regards",
            "",
            "-- Message terminated...",
            "//Terminal Closed//"
          ];
          break;
        case "unauthed":
          lines = [
            "Booting terminal...", 
            "Loading system env...",
            "Established secure connection to host << all systems online",
            "             ",
            "Fetching message...                ",
            "",
            "Dear user,",
            "It appears you are accessing this Admin Menu without the proper authorization.",
            "This is not allowed, your interaction with this application has been reported.",
            "        ",
            "Kind regards",
            "                   ",
            "-- Message terminated...",
            "//Terminal Closed//"
          ];
          break;
      }
      
      let index = 0;
      let terminal = document.getElementById("terminal");
      let button = document.getElementById("redirectButton");
      let speed = 20;
      let newlinespeed = 350;

      function typeLine(line, callback) {
        let i = 0;
        function typeCharacter() {
          if (i < line.length) {
            scrollToBottom();
            terminal.innerHTML += line[i];
            i++;
            setTimeout(typeCharacter, Math.random() * (Math.random() * 100) + speed);
          } else {
            setTimeout(() => {
              scrollToBottom();
              terminal.innerHTML += "<br>";
              callback();
            }, newlinespeed);
          }
        }
        typeCharacter();
      }

      function processNextLine() {
        scrollToBottom();
        if (index < lines.length) {
          if (lines[index] === "Enter your name and press enter to continue operation:") {
            // NOT USED
            terminal.innerHTML += lines[index] + "<br>";

            let input = document.createElement("input");
            input.id = "namefield";
            input.type = "text";
            terminal.appendChild(input);
            input.focus();

            input.addEventListener("keydown", function (event) {
              if (event.key === "Enter") {
                name = input.value.trim();
                input.remove();
                
                if (userName.toLowerCase().includes(name.toLowerCase()) || userName.includes("N/A")) {
                  terminal.innerHTML += name + "<br><br>";  // Show the entered name
                  index++;
                  processNextLine();
                } else {
                  terminal.innerHTML += "<br><br>Access Denied.<br>";
                  typeLine("-- Closing Terminal Session...", () => {});
                  terminal.style.color = "red";
                  setTimeout(() => {
                    google.script.run.withSuccessHandler(url => {
                      window.top.location.href = url.toString();
                    }).GetScriptUrl();
                  }, 5000);
                }
              }
            });
          } else if (lines[index].includes("5-digit password:")) {
            // NOT USED
            terminal.innerHTML += lines[index] + "<br>";

            let input = document.createElement("input");
            input.id = "passfield";
            input.type = "text";
            terminal.appendChild(input);
            input.focus();
            scrollToBottom();

            input.addEventListener("keydown", function (event) {
              if (event.key === "Enter") {
                pass = input.value.trim();
                input.remove();
                
                if (pass.length == 5) {
                  terminal.innerHTML += pass + "<br><br>";
                  if (pass === "69420") {
                    lines.splice(index + 1, 0, "Am I really going to have to report your inappropriate conduct " + (userName == "N/A" ? name : userName) + "...                            ", "");
                  }
                  scrollToBottom();
                  index++;
                  processNextLine();
                } else {
                  terminal.innerHTML += "<br><br>Access Denied.<br>";
                  scrollToBottom()
                  typeLine("-- Closing Terminal Session...", () => {});
                  scrollToBottom()
                  terminal.style.color = "red";
                  setTimeout(() => {
                    window.location.href = "about:blank";
                  }, 5000);
                }
              }
            });
          } else if (lines[index].includes("Press [redirect] to connect")) {
            terminal.innerHTML += lines[index] + "<br>";
            scrollToBottom();
            button.style.display = "block";
          } else if (lines[index].includes("Finished Loading")) {
            speed = 20;
            newlinespeed = 350;
            typeLine(lines[index], () => {
              scrollToBottom();
              index++;
              processNextLine();
            });
          } else {
            typeLine(lines[index], () => {
              scrollToBottom();
              index++;
              processNextLine();
            });
          }
        } else {
          if (type === "first") {
            setTimeout(() => {
              google.script.run.withSuccessHandler(url => {
                window.top.location.href = url.toString();
              }).GetScriptUrl();
            }, 5000);
          }
        }
      }

      window.redi = function() {
        speed = -75;
        newlinespeed = 0;
        scrollToBottom()
        index++;
        processNextLine();
        button.style.display = "none";
        google.script.run.withSuccessHandler(url => {
          window.top.location.href = url.toString();
        }).GetScriptUrl();
      };

      function scrollToBottom() {
          document.documentElement.scrollTop = document.documentElement.scrollHeight;
      }

      function randomTerminalGlitch() {
        if (Math.random() < 0.25) {
          terminal.classList.add("glitch-effect");
          terminal.classList.add("glitch-text");
          button.classList.add("glitch-effect");
          button.classList.add("glitch-text");
          setTimeout(() => {
            terminal.classList.remove("glitch-effect");
            terminal.classList.remove("glitch-text");
            button.classList.remove("glitch-effect");
            button.classList.remove("glitch-text");
          }, 500);
        }
        setTimeout(randomTerminalGlitch, 1000);
      }
      
      processNextLine();
      randomTerminalGlitch();
    });
  </script>
</head>
<body>
  <p id="terminal"></p>
  <button onclick="redi()" id="redirectButton" style="display: none;">[redirect]</button>
  <p id="rank" style="font-size: 0px;"><?= rank; ?></p>
  <p id="factionName" style="font-size: 0px;"><?= factionName; ?></p>
  <p id="type" style="font-size: 0px;"><?= type; ?></p>
  <p id="name" style="font-size: 0px;"><?= name; ?></p>
</body>
</html>`
}

/**
 * @returns {String}
 */
function getHtmlInterview() {
  if (!isInit) throw new Error("Library is not yet initialized");
  
  return `
<!DOCTYPE html>
<html>

<head>
  <base target="_top">
  <link href='https://fonts.googleapis.com/css?family=Lexend' rel='stylesheet'>
  <style>
    * {
      font-family: Lexend;
    }
    
    body {
      background-color: whitesmoke;
      justify-content: center;
      text-align: center;
      font-family: Lexend;
    }

    @keyframes shake {
        0% {
        transform: translate(1px, 1px) rotate(0deg);
        }

        10% {
        transform: translate(-1px, -2px) rotate(-1deg);
        }

        20% {
        transform: translate(-3px, 0px) rotate(1deg);
        }

        30% {
        transform: translate(3px, 2px) rotate(0deg);
        }

        40% {
        transform: translate(1px, -1px) rotate(1deg);
        }

        50% {
        transform: translate(-1px, 2px) rotate(-1deg);
        }

        60% {
        transform: translate(-3px, 1px) rotate(0deg);
        }

        70% {
        transform: translate(3px, 1px) rotate(-1deg);
        }

        80% {
        transform: translate(-1px, -1px) rotate(1deg);
        }

        90% {
        transform: translate(1px, 2px) rotate(0deg);
        }

        100% {
        transform: translate(1px, -2px) rotate(-1deg);
        }
    }

    .shake {
        overflow: hidden;
        animation: shake 0.1s;
    }

    label {
      font-size: 23px;
      margin-top: 15px;
    }

    input,
    select,
    textarea {
      width: 100%;
      align-self: center;
      padding: 12px 20px;
      margin-bottom: 40px;
      box-sizing: border-box;
      border: 4px solid #111111;
      box-shadow: 0 0.3rem 0.4rem #111111;
      border-radius: 10px;
      -webkit-transition: 0.5s;
      transition: 0.5s;
      background-color: #444444;
      color: #fff;
      outline: none;
      text-align: center;
    }

    input:hover,
    select:hover,
    textarea:hover {
      border: 4px solid #ccc;
    }

    input:focus,
    select:focus,
    textarea:focus {
      border: 4px solid #ccc;
      background-color: #222222;
    }

    input:invalid,
    select:invalid,
    textarea:invalid {
      border: 4px solid #8B0000;
    }

    input:invalid:focus,
    select:invalid:focus,
    textarea:invalid:focus,
    input:invalid:hover,
    select:invalid:hover,
    textarea:invalid:hover {
      border: 4px solid red;
    }

    p {
      font-size: 15px;
    }

    #description {
      height: 4rem;
      text-align: left;
      justify-content: top;
      word-wrap: break-word;
      resize: none;
      text-align: left;
    }

    .submitButton {
        background-color: #4a4a4a;
        color: whitesmoke;
        text-align: center;
        align-self: center;
        border-radius: 20px;
        box-shadow: 0 0.3rem 0.4rem #111111;
        width: 45%;
        padding: 20px 20px;
        font-size: 20px;
        border: 4px solid #111111;
        transition: 0.5s ease;
        overflow: hidden;
    }

    .submitButton:hover {
        background-color: #222222;
        transition: 0.5s ease;
        cursor: pointer;
    }

    .submitButton:disabled {
        background-color: #4a4a4a;
        color: gray;
        cursor: not-allowed;
    }

    .loader {
        border: 16px solid #666666;
        border-top: 16px solid black;
        border-radius: 50%;
        width: 25px;
        height: 25px;
        animation: spin 1.2s linear infinite;
        justify-self: center;
    }

    @keyframes spin {
        0% {
        transform: rotate(0deg);
        }

        100% {
        transform: rotate(360deg);
        }
    }

    .red {
        background-color: red !important;
        color: black !important;
    }

    .green {
        background-color: green !important;
        color: black !important;
    }
  </style>
  <script>
    document.addEventListener("DOMContentLoaded", function() {
      window.GenerateDoc = function(event) {
        event.preventDefault();
        const interviewerEmail = document.getElementById("interviewerEmail").value;
        const applicantName = document.getElementById("applicantName").value;
        const applicantRank = document.getElementById("applicantRank").value;
        const button = document.getElementById("generateButton");
        const patience = document.getElementById("patience");

        if (!interviewerEmail || !applicantName || applicantName.length > 20 || !interviewerEmail.includes("@")) {
          document.body.classList.add("shake");
          setTimeout(() => {
            document.body.classList.remove("shake");
          }, 100);
          console.error("Invalid arguments");
          return;
        };

        button.disabled = true;
        button.innerHTML = '<div class="loader"></div>';
        patience.innerHTML = "<br>Please be patient while your document is being generated, a link will be provided to you here once it's done.";

        google.script.run
          .withSuccessHandler(response => {
            if (response.includes("docs.google.com")) {
              document.getElementById("docForm").reset();
              button.innerText = "Success";
              button.classList.add("green");
              patience.innerHTML = "<br><a href='" + response + "' target='_blank'>Interview Document</a>";
              document.getElementById("interviewerEmail").style.display = "none";
              document.getElementById("applicantName").style.display = "none";
              document.getElementById("applicantRank").style.display = "none";
              document.getElementById("rankLabel").style.display = "none";
              document.getElementById("nameLabel").style.display = "none";
              document.getElementById("emailLabel").style.display = "none";
            } else {
              button.classList.add("red");
              button.innerText = response;
              patience.innerHTML = "";
              setTimeout(() => {
                button.classList.remove("red");
                button.disabled = false;
                button.innerText = "Generate";
              }, 2000);
            }
          })
          .withFailureHandler(() => {
            button.innerText = "Something went wrong";
            document.body.classList.add("shake");
            setTimeout(() => {
              document.body.classList.remove("shake");
            }, 100);
            setTimeout(() => {
              button.disabled = false;
              button.innerHTML = "";
              button.innerText = "Submit";
            }, 2000);
          })
          .GenerateInterview(interviewerEmail, applicantName, applicantRank);
      };

      // Set the rank selects
      let ranks = document.getElementById("ranks").innerText;
      const rankSelect = document.getElementById("applicantRank");

      if (ranks) {
        ranks = ranks.split(",");
      } else {
        ranks = [];
      }

      for (rank of ranks) {
        const rankOption = document.createElement("option");
        rankOption.value = rank;
        rankOption.innerText = rank;
        rankSelect.appendChild(rankOption);
      }

      let emails = document.getElementById("emails").innerText;
      const emailSelect = document.getElementById("interviewerEmail");

      if (emails) {
        emails = emails.split(",");
      } else {
        emails = [];
      }

      for (email of emails) {
        const emailOption = document.createElement("option");
        emailOption.value = email;
        emailOption.innerText = email;
        emailSelect.appendChild(emailOption);
      }
    });
  </script>
</head>

<body>
    <h1>Generate Interview Document</h1>
    <p>Fill out all of the below questions in order to properly generate an Interview Document.<br>
    This script will use the template to automatically create a usable document in order for you to swiftly conduct an Interview.<br><br>
    It will fill out the information that you provide below and it will randomly select 10 questions from a list of predfined questions, which the applicant will need to answer.</p><span id="patience"></span>
    <hr>
    <form id="docForm">
      <label for="interviewerEmail" id="emailLabel">Enter your email address:</label>
      <select id="interviewerEmail" required>
      </select>
      <label for="applicantName" id="nameLabel">Enter the <strong>name</strong> of the applicant undertaking this Interview:</label>
      <input type="text" id="applicantName" placeholder="Enter the name of the applicant that is undertaking this interview" maxlength="20" required>
      <label for="applicantRank" id="rankLabel">Select the name of the rank that this interview is for. If your desired rank is not on the list, open a ticket on the discord.</label>
      <select id="applicantRank" required>
      </select>
      <button onclick="GenerateDoc(event)" type="submit" class="submitButton" id="generateButton">Generate</button>
    </form>
    <p id="ranks" style="font-size: 0px;"><?= ranks ?></p>
    <p id="emails" style="font-size: 0px;"><?= emails ?></p>
</body>

</html>`;
}