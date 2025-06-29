/**
 * Gets the HTML content for the admin menu (template)
 * 
 * Parameters: 
 *  template.user = user;
 * template.ranks = LIBRARY_SETTINGS.ranks;
 * template.modRanks = LIBRARY_SETTINGS.modRanks;
 * template.managerRanks = LIBRARY_SETTINGS.managerRanks;
 * template.adminRanks = LIBRARY_SETTINGS.adminRanks;
 * template.allowedStaff = allowedStaff;
 * template.factionName = LIBRARY_SETTINGS.factionName;
 * template.groups = LIBRARY_SETTINGS.group;
 * template.hex = LIBRARY_SETTINGS.colorHex;
 * template.sheetId = LIBRARY_SETTINGS.spreadsheetId_main;
 * template.supervisorIdentifier = LIBRARY_SETTINGS.supervisorsDisabled;
 * @returns {String}
 */
function getAdminMenu() {
  return `
  <!DOCTYPE html>
<html>

<head>
  <title>Main Web App: <?= factionName ?> Admin Menu</title>
  <base target="_top">
  <link href='https://fonts.googleapis.com/css?family=Lexend' rel='stylesheet'>
  <link href='https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css' rel='stylesheet'>
  <?!= RosterService.includeCSS(); ?>
  <?!= RosterService.includeJS(); ?>
</head>

<body>

  <div class="lockdown-banner" style="display: none;" id="lockdown-topbanner">🚨 <?= factionName ?> Documentation is currently under lockdown 🚨</div>
  <div id="actionBanner" style="display: none;">
    <h3>Request <span id="requestType"></span></h3>
  </div>
  <div id="afkBanner" class="hazard-background" style="display: none;">
    <h1>AFK Warning</h1><br>
    <h3>Please do not open the admin menu if you do not need to be here.</h3>
  </div>
  
  <p id="viewChange" style="font-size: 0px;"><?= viewChange ?></p>
  <p id="accessType" style="font-size: 0px;"><?= accessType ?></p>
  <p id="adminRanks" style="font-size: 0px;"><?= adminRanks ?></p>
  <p id="groups" style="font-size: 0px;"><?= groups ?></p>
  <p id="hex" style="font-size: 0px;"><?= hex ?></p>

  <div class="loader" id="changeLoader"></div>
  <div id="update-popup" class="main-content" style="display: none;">
    <div class="container">
      <div class="textbox">
        <h1>ChangeLog: <?= changeDate; ?></span></h1><br>
        <h3>There has been an update to this admin menu, please read the changelogs below to stay up to date with the latest changes.</h3><br>
        <hr><br>
        <div class="changelog">
          <h3>Update Notes:</h3><br>
          <ul id="changeLogList">
          </ul>
        </div>
        <button class="submitButton-mini" onclick="CloseChangelog(event)" style="margin-top: 50px;">Close</button>
      </div>
    </div>
  </div>

  <div id="admin-menu" style="display: none;">
    <!-- Sidebar NAVIGATION - Permanently displayed -->
    <div class="sidebar">
      <div class="top">
        <!-- THIS DIV IS FULLY HIIDEN -(importing images don't work) -->
        <div class="logo">
          <i class="bx bxl-codepen"></i>
          <span>Admin Menu</span>
        </div>
        <i class="https://drive.google.com/uc?export=view&id=1pftsKrkMT4231wMYCVDyvWPdcDT4nuqP" id="btn"></i>
      </div>
      <!-------------------------------->
      <ul>
        <li>
          <button onclick="ShowDash()">
            <i class="bx bxs-dashboard bx-tada-hover"></i>
            <span class="tooltip">Dashboard</span>
          </button>
        </li>
        <li>
          <a href="https://docs.google.com/spreadsheets/d/1w2Xl7gpPY_VmXC_a67jOpglw-mFrNuDWnzcis9kjum0/edit?usp=sharing"
            target="_blank">
            <button>
              <i class="bx bx-grid bx-tada-hover"></i>
              <span class="tooltip">Roster</span>
            </button>
          </a>
        </li>
        <!-- <li>
          <button onclick="ShowConnections()">
            <i class='bx bx-link bx-tada-hover'></i>
            <span class="tooltip">Connections</span>
          </button>
        </li> -->
        <li>
          <button onclick="ShowManual()">
            <i class="bx bxs-book-bookmark bx-tada-hover"></i>
            <span class="tooltip">Manual</span>
          </button>
        </li>
        <li>
          <button onclick="ShowSearch()">
            <i class='bx bx-search-alt-2 bx-tada-hover'></i>
            <span class="tooltip">Search</span>
          </button>
        </li>
        <? if (accessType === "admin" || accessType === "dev") { ?>
        <li>
          <button onclick="ShowConfig()">
            <i class='bx bxs-cog bx-tada-hover'></i>
            <span class="tooltip">Config</span>
          </button>
        </li>
        <? } ?>
        <? if (accessType === "manager" || accessType === "admin" || accessType === "dev") { ?>
        <li>
          <button onclick="ShowRequests()" id="requestButton">
            <i class='bx bx-calendar-check bx-tada-hover' ></i>
            <span class="tooltip">Requests</span>
          </button>
        </li>
        <? } ?>
        <!-- <li>
          <button onclick="">
            <i class='bx bx-bell bx-tada-hover' ></i>
            <span class="tooltip">Notifications</span>
          </button>
        </li> -->
      </ul>
    </div>

    <!-- Dashboard (with options to go to forms) -->
    <div class="main-content" id="dashboard">
      <div class="container">
        <div class="textbox">
          <h1><i class="bx bxs-dashboard"></i> Dashboard</h1><br>
          <h3>This menu is only to be accessed by authorized individuals.<br>
            If you are here unauthorized, no function will work.
          </h3><br>
          <hr><br>
          <p>If you would be confused about what to do, don't be afraid to consult the <?= factionName ?> Leadership Handbook or ask
            your superior for help.<br>
            This page is where all <?= factionName ?> roster edits are made, our systems do everything automatically so do not worry
            about handling permissions or such.</p><br><br>
          <p style="font-weight: bold; font-size: 17px;">Click on either one of the below options to use the <?= factionName ?> Admin Menu
          </p>
          <div class="box-container">
            <button class="option-box" onclick="OpenLogForm()">
              <div class="button-text-align">
                <h3> <i class="bx bxs-wrench"></i> Submit a Log</h3> <br>
                <hr> <br>
                <p>Select this option if you would like to perform basic roster operations such as submitting a log or
                  making a rank change. <br> <br>
                  This can include things like: <br> <br>
                  Rank Changes <br>
                  Infraction Logs <br>
                  Blacklists <br>
                  etc...
                </p>
              </div>
            </button>
            <? if (accessType !== "visitor") { ?>
            <button class="option-box" onclick="OpenEditForm()">
              <div class="button-text-align">
                <h3> <i class="bx bx-edit"></i> Modify Personnel Info</h3> <br>
                <hr> <br>
                <p>Select this option if you would like to modify specific information about a <?= factionName ?> member. <br><br>
                  This can include things like: <br><br>
                  Name <br>
                  Player ID <br>
                  Discord ID <br>
                  Email-address <br>
                  etc...
                </p>
              </div>
            </button>
            <? } ?>
          </div>
          <table class="config-switches" style="margin-top: 30px; display: none;" id="terminalConfig">
              <td>
                Enable/Disable terminal animation when opening admin menu:
              </td>
              <td class="config-switch">
                <label class="switch">
                  <input type="checkbox" id="showTerminalSlider">
                  <span class="slider round"></span>
                </label>
              </td>
            </tr>
          </table>
        </div>
      </div>
    </div>

    <!-- Connections -->
    <!-- <div class="main-content" id="connections" style="display: none;">
      <div class="container">
        <div class="textbox">
          <h1>Connections</h1><br>
          <p>This page contains other rosters/admin menus for quick navigation.</p>
        </div>
      </div>
    </div> -->

    <!-- User Manual -->
    <div class="main-content" id="usermanual" style="display: none;">
      <div class="container">
        <div class="textbox">
          <h1><i class="bx bxs-book-bookmark"></i>User Manual</h1><br>
          <p>In this manual I will explain all the necessary things you will need to know in order to operate this Admin
            Menu. Alongside this, I will also go into more detail about how some of these functions work at the end of the
            manual if you are curious. You can always consult your supervisor if you would be unsatisfied with the level
            of detail of this manual, in which case they can provide you with more information.</p><br>
          <hr><br>
          <p>
            <strong>Before we begin I must emphasize: NEVER edit the <?= factionName ?> roster directly unless you know very well what you're doing. The whole reason why this
              admin menu was made is so you don't have to make direct edits to the spreadsheet itself. Why you might ask?
              This is because the Admin Menu performs a lot of operations behind the scenes, such as managing document access.
              If you add a <?= factionName; ?> member manually you will also have to manually give them permissions to all the folders.
              Using this UI might seem slow and inefficient, but trust me that you are saving yourself a lot of time &
              effort. In order to prevent human error, please use the admin menu. Thanks :)</strong>
          </p><br>
          <div class="box-container" id="manual-box">
            <div class="dashboard-manual">
              <p class="left-text">The main reason why you would access the Admin Menu is, of course, to manage the <?= factionName ?>
                Roster. In order to do this, you must access the "dashboard" using the sidebar to your right. There you
                can
                choose between submitting a log or modifying personnel info. </p><br>
              <ol style="text-align: left; margin-left: 40px;">
                <li>
                  <p>Submitting a log is used to perform various tasks on the roster, most of these operations are done
                    automatically. For example: if you submit a rank change, the person will automatically be moved on the
                    roster and their document access will be updated. This can take a few seconds to process.</p><br>
                </li>
                <li>
                  <p>Modifying personnel info is only used to edit specific information about a certain member, such as
                    their name or discord ID. This can be handy when for example somebody decides to switch to a new
                    discord account, you can then edit their discord ID to match the new account.</p>
                </li>
              </ol><br><br>
              <p class="left-text">Once you have selected one of these two options, a form will be displayed. Fill out all
                the questions correctly and <strong>double check your answers before submitting</strong> as they cannot be changed
                later. If you are 100% sure that your answers are correct, press submit and be patient while the request
                is being processed. This can take up to 40 seconds to complete so don't panic if
                your change isn't immediately visible. Never "try again" and submit a second time, this will only break
                things. If your change has failed to show up after two minutes just contact a member of Staff Administration through a discord ticket. They will investigate the issue.<br>
                This is about all the information that you need to know in order to properly operate this UI and the staff
                roster.</p><br>
              <h2>Want to know more?</h2><br>
              <p class="left-text">Below you can find all sorts of video & text tutorials that I used, that will get you
                started on understanding how this UI functions and, hopefully, also teach you how to do it
                yourself.<br><br>
                <i class='bx bxs-tag-alt'></i> <a
                  href="https://youtube.com/playlist?list=PLv9Pf9aNgemt82hBENyneRyHnD-zORB3l&si=2WfgL0itSXsRhUQe"
                  target="_blank" class="visible-link">Full course on Google Web Applications</a> -- This tutorial is
                quite old, but so is google apps script. So apart from the old editor layout you will see in this course,
                the language & features are still the same.<br>
                <i class='bx bxs-tag-alt'></i> <a href="https://www.w3schools.com/html/default.asp" target="_blank"
                  class="visible-link">HTML (CSS & JS) documentation</a> -- W3schools is one of the best online sources
                for web development and I cannot recommend it more. For Google Web Apps, you"ll really only need to go
                over the HTML, CSS and Javascript tutorials but there is so much more to find there.<br>
                <i class='bx bxs-tag-alt'></i> <a href="https://boxicons.com/" target="_blank"
                  class="visible-link">Boxicons Library</a> -- Boxicons is a free library full of amazing icons for
                websites. All the icons on this web application come from there, imported as a font. There are many more
                icon libraries out there, and they're all good, but I found boxicons to be the easiest to use.<br>
                <i class='bx bxs-tag-alt'></i> <a href="https://developers.google.com/apps-script/reference"
                  target="_blank" class="visible-link">Apps Script Reference</a> -- This is the official documentation on
                Google Apps Script by Google. Everything you will need to know about this language can be found here.<br>
                <i class='bx bxs-tag-alt'></i> <a href="https://github.com/google/clasp" target="_blank"
                  class="visible-link">Clasp</a> -- Clasp is a software that will let you write Google Apps Script code
                inside of your favorite IDE/Text Editor, instead of having to use the default browser editor. This does
                require you to install NodeJS.<br>
                <i class='bx bxs-tag-alt'></i> <a href="https://chatgpt.com/" target="_blank" class="visible-link">AI
                  (such as ChatGPT)</a> -- AI is, whether you want to accept it or not, a very useful tool for developers
                to assist you. There is nothing wrong with asking ChatGPT for help. ALTHOUGH, I do not recommend asking AI
                to just write the code for you, this won't help you in any way and just make you a worse programmer. Use
                it as a tool, not a goal.
              </p>
              </p>
            </div>
          </div>
          <div class="box-container">
            <div>
              <h2>Your Information</h2><br>
              <h3><strong>Name: </strong>
                <?= data.name; ?>
              </h3><br>
              <h3><strong>Player ID: </strong>
                <?= data.playerId; ?>
              </h3><br>
              <h3><strong>Discord ID: </strong>
                <?= data.discordId; ?>
              </h3><br>
              <h3><strong>Rank: </strong>
                <?= data.rank; ?>
              </h3><br>
              <h3><strong>Status: </strong>
                <?= data.status; ?>
              </h3><br>
              <h3><strong>Notes: </strong>
                <?= data.notes; ?>
              </h3><br>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Search Panel -->
    <div class="main-content" id="search_panel" style="display: none;">
      <div class="container">
        <div class="textbox">
          <h1><i class='bx bx-search-alt-2'></i> Search Panel</h1><br>
          <p>Input a Player ID and you will be shown all logs related to this ID.</p><br>
          <form>
            <label for="inputField">Enter Player ID:</label><br>
            <input type="text" id="inputField" maxlength="25" required style="width: 20%;" />
            <button type="submit" class="submitButton-mini-mini" onclick="UpdateDiv(event)">Submit</button>
          </form>
          <p id="loading-search"></p><br>
          <div class="loader" id="searchLoading"></div>
          <div id="outputDiv">
            <!-- Search output goes here -->
          </div>
        </div>
      </div>
    </div>

    <!-- Requests Panel -->
    <div class="main-content" id="requests-panel" style="display: none;">
      <div class="container">
        <div class="textbox">
          <h1><i class='bx bx-calendar-check'></i> Requests Overview</h1><br>
          <p>From here you can manage incoming requests made by roster moderators.<br>They need your authorization in order to perform an action, you may accept/decline these requests here. They will be notified of your verdict.</p><br>
          <div id="mainDiv">
            <!-- Request output goes here -->
          </div>
        </div>
      </div>
    </div>

    <!-- Config Panel -->
    <div class="main-content" id="config" style="display: none;">
      <div class="container">
        <div class="textbox" id="config-textbox" style="display: none;">
          <h1> <i class='bx bxs-cog'></i> Config Panel</h1><br>
          <p>Configure all sorts of aspects of the <?= factionName ?> Roster here!<br>When changing something in this menu, wait for
            the loading animation at the bottom of the page to stop before performing another operation.</p>
          <br>
          <hr><br>

          <button id="generalConfig" class="submitButton">General Config</button>
          <div id="generalConfigContent" class="container">
            <form id="config-form-modRanks">
              <label for="mod-role-select"><strong>Select Rank to add/remove Mod access to the Admin Menu</strong><br><span style="font-size: 13px; font-weight: 100;">"Mod" access means that the person won't get acess to requests or config and all logs/edits they make via this menu will need to be approved by a manager, though they are able to perform operations on their subordinates.
              <br>(if the rank already had access, they will be removed. If they didn't, they will be added.)<br>Current allowed ranks: <span id="modRanks"><?= modRanks.join(", ") ?></span></span><br>
              </label><br>
              <select id="mod-role-select" style="width: 50%;" >
              </select>
              <button id="ModRankButton" onclick="SaveRanks(event, true)" type="submit" class="submitButton-mini">Add/Remove</button>
            </form><br><hr><br>

            <form id="config-form-managerRanks">
              <label for="manager-role-select"><strong>Select Rank to add/remove Manager access to the Admin Menu</strong><br><span style="font-size: 13px; font-weight: 100;">"Manager" access means that the person won't get acess to the config but they will be able to accept/deny requests made by their subordinates & also manage their subordinates themselves.
              <br>(if the rank already had access, they will be removed. If they didn't, they will be added.)<br>Current allowed ranks: <span id="managerRanks"><?= managerRanks.join(", ") ?></span></span><br>
              </label><br>
              <select id="manager-role-select" style="width: 50%;" >
              </select>
              <button id="ManagerRankButton" onclick="SaveRanks(event, false)" type="submit" class="submitButton-mini">Add/Remove</button>
            </form><br><hr><br>

            <form id="config-new-folder">
              <label for="newFolderId">Enter the ID of the folder/file you want to register/deregister<br><span style="font-size: 13px; font-weight: 100;">If your folder/file was already registed, it will be deregistered instead.<br>In order to register a file/folder, it must be owned by "dontorro208@gmail.com".</span></label><br>
              <input type="text" id="newFolderId" style="width: 50%;" placeholder="Enter folder or file ID (one at a time)">
              <button type="submit" onclick="ManageAllFolders(event)" class="submitButton-mini" id="newfolder-button">Manage</button><br>
              <button type="button" class="submitButton" id="registeredListButton" style="width: 40%;">Registered File & Folder List</button><br>
              <div id="registeredListContent" class="container" style="width: 40%;"></div>
            </form><br><hr><br><br>

            <? if (accessType === "dev") { ?>
            <form id="changelog-form">
              <label for="changes"><strong>Add the change notes, seperated by a comma:</strong></label><br>
              <input type="message" id="changes" placeholder="Add your changes, seperated by a comma" minlength="20" style="width: 50%;"  required></input>
              <button id="changelogButton" onclick="SubmitChangelog(event)" type="submit" class="submitButton-mini">Submit</button>
            </form><br>
            <? } ?>
          </div><br><br>

          <button id="manageRank" class="submitButton">Manage Ranks</button>
          <div id="newRankContent" class="container">
            <form id="newrankForm">
              <label for="editRankSelect">Select if you want to edit an exsiting rank:</label><br>
              <select id="editRankSelect" onchange="FillRank(event)">
              </select><br>
              <label for="newRankTitle">Add a title to your rank:</label><br>
              <input id="newRankTitle" type="text" placeholder="Add rank Title" required><br>
              <label for="new-rank-before-select">Add your rank before this rank in the hierarchy:<br><span style="font-size: 13px; font-weight: 100;">Optional, default: at the top of the hierarchy (below the LTCOM)</span></label><br>
              <select id="new-rank-before-select">
              </select><br>
              <label for="new-rank-group-select">Add your rank to this group:</label><br>
              <select id="new-rank-group-select" required>
              </select><br>
              <label for="newRankViewFolders">Add the IDs of the folders/files that this rank should have viewer access to:<br><span style="font-size: 13px; font-weight: 100;">Seperate the IDs with a comma, <?= factionName ?> related files/folders ONLY</span></label><br>
              <input type="text" id="newRankViewFolders" placeholder="Add the file & folder IDs seperated by a comma"><br>
              <label for="newRankEditFolders">Add the IDs of the folders/files that this rank should have editor access to:<br><span style="font-size: 13px; font-weight: 100;">Seperate the IDs with a comma, <?= factionName ?> related files/folders ONLY</span></label><br>
              <input type="text" id="newRankEditFolders" placeholder="Add the file & folder IDs seperated by a comma">
              <table class="config-switches">
                <tr>
                  <td>
                    Does this rank require an interview:
                  </td>
                  <td class="config-switch">
                    <label class="switch">
                      <input type="checkbox" id="interviewNeeded">
                      <span class="slider round"></span>
                    </label>
                  </td>
                </tr>
                <tr id="minMeritConfig">
                  <td>
                    Minimum Merit Count:<br><span style="font-weight: 200; font-size: 12px;">The minimum merit score players must have in order to be promoted to the next rank.<br>(Set to 0 to disable this)</span>
                  </td>
                  <td class="config-switch">
                    <input type="number" id="meritsNeeded" min="0" max="25" style="width: 100%; font-size: 20px; text-align: center; margin-bottom: 0px;" required>
                  </td>
                </tr>
                <tr id="addReqButton">
                  <td>
                    Add Promotion Requirements<br><span style="font-weight: 200; font-size: 12px;">Max 5, Min 0 (set to 0 for no promo reqs)</span>
                  </td>
                  <td class="config-switch">
                    <button onclick="AddReq(event)" class="submitButton-mini" style="width: 100%; font-size: 20px; text-align: center;">+</button>
                  </td>
                </tr>
              </table><br>
              <div id="reqs"></div>
              <button onclick="AddNewRank(event)" class="submitButton" id="newrank-button" type="submit">Submit New Rank</button>
            </form><br><hr><br>

            <form id="config-form-removeRank">
              <label for="remove-rank-select"><strong>Select a rank to delete from the roster:</strong></label><br>
              <select id="remove-rank-select" style="width: 50%;">
              </select>
              <button onclick="RemoveRank(event)" class="submitButton-mini" id="removeRank-button">Delete</button>
            </form><br><hr><br>

            <form id="config-form-rankRow">
              <label for="new-rank-select"><strong>Select a rank to add/remove a slot to/from.</strong><p style="font-weight: 200; font-size: 12px;">Current # of <span id="currentSlotsName"></span> Slots: <span id="currentSlotsNum"></span></p></label><br>
              <select id="new-rank-select" style="width: 38%;">
              </select>
              <input type="number" id="rankRowAmount" style="width: 8%;" placeholder="#">
              <button onclick="AddRankRow(event)" class="submitButton-mini-mini" id="addrankrow-button" style="width: 7%;">Add</button>
              <button onclick="RemoveRankRow(event)" type="submit" class="submitButton-mini-mini" id="removerankrow-button" style="width: 7%;">Remove</button>
            </form><br>
          </div><br><br>

          <button id="manageSpecialization" class="submitButton">Manage Specializations</button>
          <div id="manageSpecContent" class="container">
            <form id="spec-form">
              <label for="editSpecSelect">Select if you want to edit an existing specialization:</label><br>
              <select id="editSpecSelect" onchange="FillSpec(event)">
              </select><br>
              <label for="specTitle">Give your specialization a name:</label><br>
              <input type="text" id="specTitle" placeholder="Add a name to your specialization" maxlength="20" required><br>
              <label for="specDesc">Give your specialization a description:</label><br>
              <input type="text" id="specDesc" placeholder="Add a description to your specialization" maxlength="250" required>
              <button onclick="AddNewSpec(event)" class="submitButton" id="spec-button" type="submit">Submit New Specialization</button>
            </form><br><hr><br>
            <form id="removespec-form">
              <label for="removeSpec">Select a specialization to remove:</label><br>
              <select id="removeSpec" style="width: 50%">
              </select>
              <button onclick="RemoveExistingSpec(event)" class="submitButton-mini" id="removespec-button" type="submit">Remove</button>
            </form>
          </div><br><br>

          <button id="manageCooldown" class="submitButton">Manage Cooldowns</button>
          <div id="manageCooldownContent" class="container">
            <form id="loa-cooldown-form">
              <label for="loaCooldown">Add the cooldown between LOAs in days:<br><span style="font-size: 13px; font-weight: 100;">minimum: 0, maximum: 60</span></label><br>
              <input type="number" id="loaCooldown" placeholder="Enter cooldown in days">
              <button onclick="ChangeLOACooldown(event)" class="submitButton-mini" id="loaCooldown-button" type="submit">Change</button>
            </form><br><hr><br>
            <form id="promo-cooldown-form">
              <label for="promoCooldown">Add the cooldown between Promotions in days:<br><span style="font-size: 13px; font-weight: 100;">minimum: 0, maximum: 60</span></label><br>
              <input type="number" id="promoCooldown" placeholder="Enter cooldown in days">
              <button onclick="ChangePromoCooldown(event)" class="submitButton-mini" id="promoCooldown-button" type="submit">Change</button>
            </form>
          </div><br><br>

          <button id="manageThreshold" class="submitButton">Manage Infraction Threshold</button>
          <div id="manageThresholdContent" class="container">
            <form id="threshold-form">
              <label for="threshold">Enter Required Amount of Infractions:<br><span style="font-size: 13px; font-weight: 100;">The amount of infractions a person should have in order to reach the threshold</span></label><br>
              <input type="number" id="threshold" placeholder="Enter required amount of infractions"><br>
              <label for="thresholdActionSelect">Which action should be performed if threshold is reached:</label><br>
              <select id="thresholdActionSelect">
                <option value=""></option>
                <option value="Demotion">Demotion</option>
                <option value="Removal">Removal</option>
                <option value="Suspension">Suspension</option>
              </select><br>
              <button onclick="ManageThreshold(event)" class="submitButton" id="threshold-button" type="submit">Submit</button>
            </form><br>
          </div><br><br>

          <button id="manageMerits" class="submitButton">Manage Merit System</button>
          <div id="manageMeritsContent" class="container">
            <form id="manageMerit-form">
              <label for="editMeritActionSelect">Select if you want to edit an merit action:<br><span style="font-size: 13px; font-weight: 100;">A merit action is an action (such as hosting a cross-training) that is worth merits.</span></label><br>
              <select id="editMeritActionSelect" onchange="FillMeritAction()">
              </select><br>
              <label for="meritActionTitle">Give your merit action a name:</label><br>
              <input type="text" id="meritActionTitle" placeholder="Add a name to your merit action" maxlength="60" required><br>
              <label for="meritActionDesc">Give your merit action a description:</label><br>
              <input type="text" id="meritActionDesc" placeholder="Add a description to your merit action" maxlength="200" required><br>
              <label for="meritActionPoints">How many merits will be awarded for this action:<br><span style="font-size: 13px; font-weight: 100;">Current Amount: <span id="meritSliderOutput">1</span></span></label><br>
              <input type="range" id="meritActionPoints" max="5" min="1" value="1" required><br>
              <button onclick="ManageMeritActions(event)" class="submitButton" id="meritAction-button" type="submit">Submit New Merit Action</button>
            </form><br><hr><br>
            <form id="removeMeritAction-form">
              <label for="removeMerit">Select a merit action to remove:</label><br>
              <select id="removeMerit" style="width: 50%">
              </select>
              <button onclick="RemoveMeritAction(event)" class="submitButton-mini" id="removemerit-button" type="submit">Remove</button>
            </form>
          </div>

          <table class="config-switches" style="margin-top: 30px;">
            <tr>
              <td>
                Enable Manual Editing of the roster:
              </td>
              <td class="config-switch" style="text-align: center;">
                <label class="switch">
                  <input type="checkbox" id="manualEditingSlider">
                  <span class="slider round"></span>
                </label>
              </td>
            </tr>
            <tr>
              <td>
                Enable time-based (12h) Backups being made of the roster:
              </td>
              <td class="config-switch" style="text-align: center;">
                <label class="switch">
                  <input type="checkbox" id="backupSlider">
                  <span class="slider round"></span>
                </label>
              </td>
            </tr>
            <tr>
              <td>
                Allow discord pings:<br><span style="font-weight: 200; font-size: 12px;">Enable/Disable people being pinged for things like promotions etc...</span>
              </td>
              <td class="config-switch" style="text-align: center;">
                <label class="switch">
                  <input type="checkbox" id="pingSlider">
                  <span class="slider round"></span>
                </label>
              </td>
            </tr>

            <? if (accessType === "dev") { ?>
            <tr>
              <td>
                Make a roster backup immediately:
              </td>
              <td class="config-switch">
                <button class="submitButton-mini-mini" id="backupButton" onclick="MakeBackup(event)">Backup</button>
              </td>
            </tr>
            <tr>
              <td>
                Restore the roster to its latest backup:<br><span id="backupTime" style="font-weight: 200; font-size: 12px;" onclick="RefreshBackupTime(event)"></span>
              </td>
              <td class="config-switch">
                <button class="submitButton-mini-mini" id="restoreBackupButton" onclick="RestoreBackup(event)">Restore</button>
              </td>
            </tr>
            <? } ?>
            
            <tr>
              <td>
                <span id="reqIdentifier"></span> <?= factionName ?> Promotion Requirements:<br><span style="font-weight: 200; font-size: 12px;">Disabling this will hide sheets/inputs regarding promotion requirements</span>
              </td>
              <td class="config-switch">
                <button class="submitButton-mini-mini" id="toggleReqsButton" onclick="ToggleReqsDisabled(event)">Requirements</button>
              </td>
            </tr>
            <tr>
              <td>
                Reset all <?= factionName ?> Documentation Permissions:<br><span style="font-weight: 200; font-size: 12px;">All perms will be removed & re-added for a quick emergency reset.</span>
              </td>
              <td class="config-switch">
                <button class="submitButton-mini-mini" id="resetButton" onclick="ResetPerms(event)">Reset</button>
              </td>
            </tr>
            <tr>
              <td>
                <span id="lockdownIdentifier"></span> a full Lockdown of all <?= factionName ?> Documentation:
              </td>
              <td class="config-switch">
                <button class="submitButton-mini-mini" style="background-color: red;" id="lockdownButton" onclick="LockdownInit(event)">Lockdown</button>
              </td>
            </tr>
          </table>
        </div>
        <p id="config-loading" style="margin-top: 15px;"></p>
        <p style="font-size: 0px;" id="ranks"><?= ranks ?></p>
        <p style="font-size: 0px;" id="rank"><?= data.rank ?></p>
      </div>
    </div>

    <div class="main-content" id="data-forms" style="display: none;">
      <div class="container">
        <div class="textbox">

          <div id="loggerForm" style="display: none;">
            <form id="dataform">
              <h1><?= factionName; ?> Roster Logger Form</h1>
              <p>Please fill out <strong>all</strong> the below questions in order to submit a log.</p>
              <p>Before submitting, double-check your answers as once you press the button, they can no longer be
                adjusted.
              </p>
              <br>
              <hr>
              <br>
              <h3>Main Options</h3>
              <br>
              <p>Please select which type of log you want to submit.</p><br>
              <select id="logTypeList" onchange="HideCheck()">
                <? if (accessType !== "visitor") { ?>
                <option value="Rank Change">Rank Change</option>
                <option value="New Member">Add New <?= ranks[0] ?></option>
                <option value="Infraction Log">Infraction Log</option>
                <? } ?>
                <option value="LOA Log">LOA Log</option>
                <option value="Requirement Log">Promotion Requirement Log</option>
                <option value="Merit Log">Merit Log</option>
                <? if (accessType === "dev" || accessType === "admin") { ?>
                <option value="Blacklist">Blacklist / Suspension</option>
                <? } ?>
                <? if (accessType === "dev") { ?>
                <option value="Infraction Appeal">Appeal Infraction [OSM+]</option>
                <option value="Blacklist Appeal">Appeal Blacklist [OSM+]</option>
                <? } ?>
              </select>
              <hr><br>
              <h3>Log Information</h3>
              <br>
              <p>All below questions must contain info related to the log / the person to whom the log is targeted.<br>Do
                not include information about yourself.
              </p><br>
              <label for="idfield" id="idfieldlabel" style="display: none;">The log ID is the row where the log you want
                to appeal is located.</label>
              <input type="number" placeholder="Log ID; minimum 7, up to 1003" id='idfield' min="7" max="1003"
                style="display: none;" required />
              <label for="infrtypelist" id="infrlabel" style="display: none;">Select an Infraction Type:</label>
              <select type="text" id='infrtypelist' style="display: none;" required>
                <option value=''></option>
                <option value="Minor">Minor</option>
                <option value="Regular">Regular</option>
                <option value="Severe">Severe</option>
              </select>
              <label for="bltypelist" id="bllabel" style="display: none;">Do you want to log a Blacklist or
                Suspension?:</label>
              <select type="text" id='bltypelist' style="display: none;" onchange="BlacklistToggle()" required>
                <option value=''></option>
                <option value="Suspension">Suspension</option>
                <option value="Blacklist">Blacklist</option>
              </select>
              <label for='appealable' id='appealablelabel' style="display: none;">Is the Blacklist appealable?:</label>
              <select type="text" id="appealable" style="display: none;" required>
                <option value=''></option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
              <input type="text" placeholder="Name" id='namefield' maxlength="20" style="display: none;" required />
              <input type="text" placeholder="5-hex Player ID" id='playerIdfield' maxlength="25" style="display: none;" required />
              <input type="text" placeholder="Discord ID" id='discordidfield' maxlength="25" style="display: none;" required />
              <input type="text" placeholder="Email Address" id='newMemberEmailField' maxlength="40" style="display: none;" required />
              <select id="emailfield" required/>
                <option value=''></option>
              </select>
              <label for="rctypefield" id='rctypelabel'>Rank Change Type:</label>
              <select id="rctypefield" style='display: block;' required>
                <option value=''></option>
                <option value='Promotion'>Promotion</option>
                <option value="Demotion">Demotion</option>
                <option value="Removal">Removal</option>
              </select>
              <label for="enddatefield" id="enddatelabelLOA" style="display: none;">Select end date of LOA:</label>
              <label for="enddatefield" id="enddatelabelBL" style="display: none;">Select expiry date of
                Blacklist:</label>
              <input type="date" placeholder="dd-mm-yyyy" id='enddatefield' style="display: none;" required />
              <label for="reqfield" id="reqfieldlabel" style="display: none;">Select which requirement you have completed:</label>
              <select id="reqfield" style='display: none;' required>
                <option value=''></option>
              </select>
              <label for="meritfield" id="meritfieldlabel" style="display: none;">Select which merit action you have completed:</label>
              <select id="meritfield" style='display: none;' required>
              </select>
              <div id="meritinfofield" style="display: none;">
                <h3>Merit Count: [ <span id="meritInfoCount"></span> ]</h3><br>
                <h3>Action Description: [ <span id="meritInfoDesc"></span> ]</h3><br>
              </div>
              <input type="text" placeholder="Reason" id='reasonfield' maxlength="70" required />
              <button onclick="SubmitLog(event)" type="submit" class="submitButton" id="loggerSubmitButton">Submit</button>
            </form>
          </div>

          <div id="editForm" style="display: none;">
            <form id="editform">
              <h1><?= factionName; ?> Roster Info Editor Form</h1>
              <br>
              <p>Please fill out <strong>all</strong> the below questions in order to submit an edit.</p>
              <p>Before submitting, double-check your answers as once you press the button, they can no longer be
                adjusted.</p>
              <br>
              <hr><br>
              <h3>Roster Edit Information</h3>
              <select id="infoTypeList" onchange="InfoHideCheck()">
                <option value="Edit Name">Edit Name</option>
                <option value="Edit playerId">Edit Player ID</option>
                <option value="Edit discordID">Edit Discord ID</option>
                <option value="Edit Email">Edit Email Address</option>
                <option value="Edit Specialization">Edit Specialization</option>
                <option value="Edit Note">Edit Notes</option>
              </select>
              <hr>
              <label for="curremailfield" id="curremaillabel">Select the Email address of the member you want to apply an
                edit to:</label>
              <select id="curremailfield" required/>
                <option value=''></option>
              </select>
              <hr><br>
              <input type="text" placeholder="Enter new name" id="newnamefield" maxlength="20" required />
              <input type="text" placeholder="Enter new Player ID" id="newplayerIdfield" style="display: none;"
                maxlength="25" required />
              <input type="text" placeholder="Enter new discord ID" id="newsdiscidfield" style="display: none;"
                maxlength="25" required />
              <input type="email" placeholder="Enter new Email Address" id="newemailfield" style="display: none;"
                maxlength="70" required />
              <select id="specfield" style="display: none;">
                <option value=""></option>
              </select>
              <input type="text" placeholder="Enter new Extra Notes" id="newnotesfield" style="display: none;"
                maxlength="125" required />
              <button onclick="SubmitEdit(event)" type="submit" class="submitButton" id="editSubmitButton">Submit</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>

</html>`
}
