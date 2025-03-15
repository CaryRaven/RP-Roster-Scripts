/**
 * Get the html page for the task manager
 * PARAMETERS: row, col, title, type
 * supported types: Postpone, Assign, Priority
 * @returns {String}
 */
function getHtmlTaskManager() {
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
    <p>Fill out all of the below questions in order to assign or unassign a member of security command to this task.<br>
    If the assigned member was to be removed, they will be unassigned automatically.<br>
    If the task would not be completed by the deadline, all assigned members will receive a "normal" infraction.</p>
    <hr>
    <form>
      <label for="gmail">Gmail address of person to assign:</label>
      <input type="text" id="gmail" placeholder="Enter the gmail address of the person you want to assign this task to." maxlength="50" required>
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
  <p style="font-size: 1px;" id="row"><?= row ?></p>
  <p style="font-size: 1px;" id="col"><?= col ?></p>
  <p style="font-size: 1px;" id="title"><?= title ?></p>
</body>

</html>`
}

/**
 * Get the html page for creating a new task
 * NO PARAMETERS
 * @returns {String}
 */
function getHtmlAddTask() {
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

      if (!title || !description || !deadline || description.length > 250 || !priority) {
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
            } else {
              button.classList.remove("red");
            }
            button.innerHTML = "";
            button.innerText = "Submit";
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
      }).SubmitTask(data)
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
    <textarea type="message" id="description" placeholder="Add a description to your task" maxlength="250" required></textarea>
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