document.addEventListener('DOMContentLoaded', () => {
    // Fetch and display chatrooms when the page loads
    fetchChatrooms();

    // UserID of current user:
    const thisUserID = "6285174388804@c.us";  

    // Selectors for common DOM elements
    const searchContact = document.querySelector('.search-contact');
    const chatBody = document.getElementById('chatContainer');
    const chatInput = document.querySelector('.chat-input');
    const chatInputField = document.getElementById("message-input-form");
    const mediaInput = document.getElementById('mediaInput');
    const addMediaButton = document.querySelector('.btn-add-media');

    let currentChatroomID = null;
    
    // Clear the textarea content 
    chatInputField.value = "";

    function saveDraft(chatroomId, draft) {
        if (chatroomId) {
            localStorage.setItem(`draft_${chatroomId}`, draft);
        }
    }

    function loadDraft(chatroomId) {
        const draft = localStorage.getItem(`draft_${chatroomId}`);
        return draft || ""; // Return empty string if no draft exists
    }

    function clearDraft(chatroomId) {
        if (chatroomId) {
            localStorage.removeItem(`draft_${chatroomId}`);
        }
    }

    // Fetch chatroom data and display it in the sidebar
    async function fetchChatrooms() {
        console.log("Fetching chatrooms...");
        try {
            const response = await fetch("http://localhost:3003/api/chatrooms");
            const chatrooms = await response.json();

            // Check for drafts and add a `hasDraft` property
            chatrooms.forEach(chatroom => {
                const draft = localStorage.getItem(`draft_${chatroom.chatID}`);
                chatroom.hasDraft = !!draft; // Boolean: true if draft exists
            });

            // Sort chatrooms: prioritize those with drafts
            chatrooms.sort((a, b) => b.hasDraft - a.hasDraft);

            displayChatrooms(chatrooms);
        } catch (error) {
            console.error('Error fetching chatrooms:', error);
        }
    }

    // Display chatrooms list in the sidebar
    function displayChatrooms(chatrooms) {
        const chatroomsList = document.getElementById('chatrooms-list');
        chatroomsList.innerHTML = '';  // Clear the list
    
        chatrooms.forEach(chatroom => {
            // Check if chatID and messages are defined before processing
            if (!chatroom.chatID || !chatroom.messages) {
                console.warn("Skipping chatroom with missing data:", chatroom);
                return;  // Skip this iteration if data is missing
            }
    
            const chatID = chatroom.chatID;
            const contact = formatContactName(chatroom);
            const lastTime = formatLastChatTime(chatroom.last_time);
            const chatroomItem = createChatroomItem(chatroom, contact, lastTime);
            
            chatroomsList.appendChild(chatroomItem);
        });

        // Add click listeners to each chatroom item after the list is populated
        addChatroomClickListeners();
    }

    function createChatroomItem(chatroom, contact, lastTime) {
        const chatroomItem = document.createElement('a');
        chatroomItem.href = "#";
        chatroomItem.classList.add("contact-list", "list-group-item", "list-group-item-action", "d-flex", "align-items-center");
    
        // Store messages in a data attribute for filtering
        chatroomItem.setAttribute('data-messages', JSON.stringify(chatroom.messages.map(msg => ({ body: msg.body }))));
    
        if (chatroom.hasDraft) {
            const draft = loadDraft(chatroom.chatID);
            chatroomItem.innerHTML = `
                <img src="./img/default-profile-picture-01.png" alt="Profile" class="profile-pic">
                <div class="row w-100">
                    <div class="d-flex w-100 justify-content-between">
                        <h5 class="contact-name mb-1">${contact}</h5>
                        <small class="last-time">${lastTime}</small>
                    </div>
                    <p class="message-preview mb-1"><span style="color: #15976e;">Draft: </span>${draft.trim()}</p>
                </div>
            `;
        } else {
            chatroomItem.innerHTML = `
                <img src="./img/default-profile-picture-01.png" alt="Profile" class="profile-pic">
                <div class="row w-100">
                    <div class="d-flex w-100 justify-content-between">
                        <h5 class="contact-name mb-1">${contact}</h5>
                        <small class="last-time">${lastTime}</small>
                    </div>
                    <p class="message-preview mb-1">${formatMsg(chatroom.last_chat)}</p>
                </div>
            `;
        }

        chatroomItem.dataset.remoteId = chatroom.chatID;
        chatroomItem.dataset.lastChat = chatroom.last_chat;
        chatroomItem.dataset.hasDraft = chatroom.hasDraft;
        chatroomItem.dataset.lastTime = chatroom.last_time;
        
        return chatroomItem;
    }
    
    function updateDraftIndicator(chatroom) {
        const remoteId = chatroom.dataset.remoteId;
        const lastChat = chatroom.dataset.lastChat;

        if (chatroom.classList.contains('selected')) {
            chatroom.querySelector('.message-preview').textContent = formatMsg(lastChat);
        } else {
            const draft = localStorage.getItem(`draft_${remoteId}`);
            if (draft) {
                chatroom.querySelector('.message-preview').innerHTML = `<span style="color: #15976e;">Draft: </span>${draft.trim()}`;
            } else {
                chatroom.querySelector('.message-preview').textContent = formatMsg(lastChat);
            }
        }
    }

    function sortChatrooms() {
        const chatroomsList = document.getElementById('chatrooms-list');
        const chatroomItems = Array.from(chatroomsList.children);
    
        chatroomItems.sort((a, b) => {
            const aHasDraft = a.dataset.hasDraft === "true";
            const bHasDraft = b.dataset.hasDraft === "true";
            const aLastTime = Number(a.dataset.lastTime);
            const bLastTime = Number(b.dataset.lastTime);
    
            // Prioritize chatrooms with drafts
            if (bHasDraft !== aHasDraft) {
                return bHasDraft - aHasDraft;
            }
    
            // If both have drafts or both don't, sort by last chat time
            return bLastTime - aLastTime;
        });
    
        // Append sorted elements back into the chatrooms list
        chatroomItems.forEach(item => chatroomsList.appendChild(item));
    }

    // Format contact name based on chat ID
    function formatContactName(chatroom) {
        if (chatroom.chatID.includes("@c.us") && chatroom.notifyName != null) {
            return chatroom.notifyName;
        } else {
            return chatroom.chatID.split('@')[0] || "Unknown Contact";
        }
    }

    // Format the timestamp for last chat time display
    function formatLastChatTime(timestamp) {
        const currentDate = new Date();
        const lastChatDate = new Date(timestamp * 1000);
        const diffDays = Math.floor((currentDate - lastChatDate) / (1000 * 3600 * 24));

        if (diffDays === 1) {
            return "Yesterday";
        } else if (diffDays >= 2 && diffDays <= 7) {
            return lastChatDate.toLocaleDateString('en-US', { weekday: 'long' });
        } else if (diffDays > 7) {
            return `${lastChatDate.getDate()}/${lastChatDate.getMonth() + 1}/${lastChatDate.getFullYear()}`;
        } else {
            return lastChatDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        }
    }

    function formatMsg(message) {
        if (message.includes("<<") || message.includes(">>")) {
            let indexLeft = message.indexOf("<<");
            let indexRight = message.indexOf(">>");

            if (indexLeft !== -1) {
                return message.substring(indexLeft + 3).trim();
            } else if (indexRight !== -1) {
                return message.substring(indexRight + 3).trim();
            }
        } else {
            return message;
        }
    }

    // Add click listeners to each chatroom item
    function addChatroomClickListeners() {
        const chatroomItem = document.querySelectorAll('.contact-list');
        chatroomItem.forEach(contact => {
            contact.addEventListener('click', () => {
                // Remove "selected" class from all chatrooms
                chatroomItem.forEach(item => {
                    item.classList.remove('selected');
                    updateDraftIndicator(item);
                });

                // Add "selected" class to the clicked chatroom 
                contact.classList.add('selected');
                updateDraftIndicator(contact);
                console.log(contact.dataset.hasDraft);

                const remoteId = contact.dataset.remoteId;
                const contactName = contact.querySelector('.contact-name').textContent;
                currentChatroomID = remoteId;

                setupChatHeader(contactName);
                revealChatInput();
                loadChatHistory(remoteId);
                chatInputField.value = loadDraft(remoteId);
            });
        });
    }

    // Set up the chat header
    function setupChatHeader(contactName) {
        const chatMain = document.querySelector('.chat-main');
        const chatHeader = chatMain.querySelector('.chat-header');
    
        if (!chatHeader) {
            console.error('chatHeader not found!');
            return;
        }

        chatHeader.classList.remove('d-none');
    
        chatHeader.innerHTML = '';
        chatHeader.innerHTML = `
            <div class="d-flex align-items-start">
                <img src="./img/default-profile-picture-01.png" alt="Profile" class="profile-pic">
                <div class="d-flex flex-column align-items-start">
                    <h5 class="contact-name mb-0 text-white">${contactName}</h5>
                    <small class="last-time">Last chat on -</small>
                </div>
            </div>
            <div class="d-flex align-items-center">
                <input type="text" class="search-message form-control me-2" placeholder="Search messages...">
                <i class="bi bi-gear settings-icon"></i>
            </div>
        `;
    
        // Attach event listener for searching messages
        const searchMessage = chatHeader.querySelector('.search-message');
        searchMessage.addEventListener('input', function (e) {
            const searchTerm = e.target.value.toLowerCase().trim();
            const messages = chatBody.querySelectorAll('.message');
            const separators = chatBody.querySelectorAll('.time-separator');
    
            messages.forEach(message => {
                const messageText = message.querySelector('.message-bubble').textContent.toLowerCase();
    
                if (messageText.includes(searchTerm)) {
                    message.classList.remove('d-none');
                } else {
                    message.classList.add('d-none');
                }
            });

            // Update time separator visibility
            separators.forEach(separator => {
                // Check if there are any visible messages after the separator
                let nextElement = separator.nextElementSibling;
                let hasVisibleMessages = false;

                while (nextElement && !nextElement.classList.contains('time-separator')) {
                    if (!nextElement.classList.contains('d-none')) {
                        hasVisibleMessages = true;
                        break;
                    }
                    nextElement = nextElement.nextElementSibling;
                }

                // Toggle visibility of the separator based on visible messages
                if (hasVisibleMessages) {
                    separator.classList.remove('d-none');
                } else {
                    separator.classList.add('d-none');
                }
            });
        });
    }

    // Reveal the chat input area
    function revealChatInput() {
        chatInput.classList.remove('d-none');
    }

    chatInputField.addEventListener("input", function () {
        // Dynamically change the height of the textarea on input
        chatInputField.style.height = "auto";
        chatInputField.style.height = chatInputField.scrollHeight + "px";
    
        if (chatInputField.value !== "") {
            saveDraft(currentChatroomID, chatInputField.value);
    
            const selectedChatroom = document.querySelector(`[data-remote-id="${currentChatroomID}"]`);
            if (selectedChatroom) {
                selectedChatroom.dataset.hasDraft = "true"; // Set the draft flag to false
            }
        } else {
            clearDraft(currentChatroomID);
    
            // Update the `hasDraft` flag in the chatroom dataset
            const selectedChatroom = document.querySelector(`[data-remote-id="${currentChatroomID}"]`);
            if (selectedChatroom) {
                selectedChatroom.dataset.hasDraft = "false"; // Set the draft flag to false
            }
        }
    
        // After saving or clearing the draft, re-sort the chatrooms
        sortChatrooms();
    });    

    // Load chat history for the selected contact
    async function loadChatHistory(remoteId) {
        console.log("Fetching chat history for " + remoteId);
        chatBody.innerHTML = '';
        try {
            const response = await fetch(`http://localhost:3003/api/chats/${remoteId}`);
            if (!response.ok) throw new Error(`Error fetching chat history: ${response.statusText}`);
            
            const messages = await response.json();
            displayChatHistory(messages);
        } catch (error) {
            console.error("Error loading chat history:", error);
            chatBody.innerHTML = `<p>Error loading chat history.</p>`;
        }
    }

    // Display chat history in chat body
    function displayChatHistory(messages) {
        if (messages.length === 0) {
            chatBody.innerHTML = '<p>No chat history available.</p>';
            return;
        }

        const lastChatTime = formatLastChatTime(messages[messages.length - 1].timestamp);
        document.querySelector('.chat-header .last-time').textContent = `Last chat on ${lastChatTime}`;

        let lastDate = null;

        messages.forEach(msg => {
            const currentDate = new Date(msg.timestamp * 1000);
            const formattedDate = currentDate.toDateString();

            // Insert a time separator if the date changes
            if (formattedDate !== lastDate) {
                const separator = document.createElement('div');
                separator.classList.add('time-separator', 'd-flex', 'align-items-center', 'justify-content-center');
                separator.textContent = formatTimeSeparator(currentDate);
                chatBody.appendChild(separator);
                lastDate = formattedDate; // Update last date
            }

            const messageDiv = document.createElement('div');

            if (currentChatroomID.includes("@g.us") && !msg.fromMe) {
                // Group message (received)
                const messageContainer = document.createElement('div');
                messageContainer.classList.add('container');
                messageContainer.innerHTML = `
                    <div class="message received d-flex justify-content-start">
                        <div class="d-flex">
                            <img src="./img/default-profile-picture-01.png" alt="${msg.notifyName || msg.from.split('@')[0]}'s profile picture" class="profile-chat">
                        </div>
                        <div class="d-flex flex-column">
                            <div class="notify-name">${msg._data.notifyName || msg.from.split('@')[0]}</div>
                            <div class="message-bubble">
                                <div class="message-body">${formatMsg(msg.body)}<div>
                                <small class="timestamp">${formatTimestamp(msg.timestamp)}</small>
                            </div>
                        </div>
                    </div>
                `;

                if (msg.hasQuotedMsg) {
                    messageBubble = messageContainer.querySelector('.message-bubble');
                    const quotedMessage = document.createElement('div');
                    quotedMessage.classList.add('quoted-message');

                    let quotedParticipant = "";
                    if (msg._data.quotedParticipant === thisUserID) {
                        quotedParticipant = "You";
                    } else {
                        quotedParticipant = msg._data.quotedParticipant.split('@')[0];
                    }

                    quotedMessage.innerHTML = `
                        <div class="notify-name">${quotedParticipant}</div>
                        ${formatMsg(msg._data.quotedMsg.body)}
                    `;

                    messageBubble.insertBefore(quotedMessage, messageBubble.firstChild);
                }
                chatBody.appendChild(messageContainer);
            } else {
                if (msg.fromMe) {
                    messageDiv.classList.add('message', 'sent', 'd-flex', 'justify-content-end');
                } else {
                    messageDiv.classList.add('message', 'received', 'd-flex', 'justify-content-start');
                }
                
                const messageBubble = document.createElement('div');
                messageBubble.classList.add('message-bubble');
                if (msg.hasQuotedMsg) {
                    const quotedMessage = document.createElement('div');
                    quotedMessage.classList.add('quoted-message');
                    quotedMessage.innerHTML = `
                        <div class="notify-name">${msg._data.notifyName || msg._data.quotedParticipant.split('@')[0]}</div>
                        ${formatMsg(msg._data.quotedMsg.body)}
                    `;

                    messageBubble.appendChild(quotedMessage);
                }
                messageBubble.innerHTML = `
                    <div class="message-body">${formatMsg(msg.body)}<div>
                `;

                const timestamp = document.createElement('small');
                timestamp.classList.add('timestamp');
                timestamp.textContent = formatTimestamp(msg.timestamp);

                messageBubble.appendChild(timestamp);
                messageDiv.appendChild(messageBubble);
                chatBody.appendChild(messageDiv);
            }
        });
    }

    // Format date for time separator
    function formatTimeSeparator(date) {
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
    
        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString(); // Display full date
        }
    }

    // Format timestamp to "hh:mm AM/PM"
    function formatTimestamp(timestamp) {
        return new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    // Filter contacts and associated messages in the sidebar
    searchContact.addEventListener('input', function () {
        const searchQuery = searchContact.value.toLowerCase().trim();

        document.querySelectorAll('.contact-list').forEach(contact => {
            const contactName = contact.querySelector('.contact-name').textContent.toLowerCase();
            const messages = JSON.parse(contact.getAttribute('data-messages') || "[]"); // Safely parse data-messages

            // Check if contact name or any associated message matches the query
            const isNameMatch = contactName.includes(searchQuery);
            const isMessageMatch = messages.some(message => message.body.toLowerCase().includes(searchQuery));

            if (isNameMatch || isMessageMatch) {
                contact.classList.remove('d-none');
            } else {
                contact.classList.add('d-none');
            }
        });
    });

    function generateID() {
        return 'xxxxxxxxxxxxxx'.replace(/[x]/g, function () {
            return (Math.random() * 16 | 0).toString(16);
        });
    }

    async function sendMessage() {
        const messageContent = chatInputField.value.trim();
        const files = mediaInput.files;

        if (messageContent && files.length === 0) {
            console.warn("Input field is empty");
        }

        const ID = generateID();

        const messageData = {
            _data: {
                id: {
                    fromMe: true,
                    remote: currentChatroomID,
                    id: ID,
                    _serialized: `true_${currentChatroomID}_${ID}`,
                },
                body: messageContent,
                type: "chat",
                t: Math.floor(Date.now() / 1000),
                from: thisUserID,
                to: currentChatroomID,
            },
            localId: {
                fromMe: true,
                remote: currentChatroomID,
                id: ID,
                _serialized: `true_${currentChatroomID}_${ID}`,
            },
            body: messageContent,
            type: "chat",
            timestamp: Math.floor(Date.now() / 1000),
            from: thisUserID,
            to: currentChatroomID,
            deviceType: "web",
            fromMe: true,
        }

        if (files.length > 0) {
            messageData.hasMedia = true;
        }

        try {
            const response = await fetch(`http://localhost:3003/api/send`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(messageData),
            });

            if (!response.ok) {
                const errorDetails = await response.json();
                throw new Error(`Error mengirim pesan: ${errorDetails.error || response.statusText}`);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          
            }
    
            const result = await response.json();
            console.log("Pesan berhasil dikirim:", result);

            // Tampilkan pesan setelah berhasil mengirim
            loadChatHistory(currentChatroomID);
            // Hapus isi chat input field
            chatInputField.value = "";
            // Hapus draft dari local storage
            clearDraft(currentChatroomID);
            // Update tampilan list chatroom
            fetchChatrooms();
        } catch (error) {
            console.error("Error saat mengirim pesan:", error);
        }
    }

    document.querySelector('.btn-send').addEventListener("click", sendMessage);
    chatInputField.addEventListener("keypress", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    })

    // Open file selector when attach button is clicked
    addMediaButton.addEventListener("click", () => {
        mediaInput.click();
    });

    // Handle file selection
    mediaInput.addEventListener("change", function (e) {
        const file = e.target.files;

        if (file.length) {
            Array.from(file).forEach(file => {
                console.log = `Attach file: ${file.name}`;

                const fileType = file.type;
                if (fileType.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const img = document.createElement('img');
                        img.src = reader.result;
                        img.alt = file.name;
                        img.style.maxWidth = "100px"; // Resize for preview
                        chatInputField.appendChild(img);
                    };
                    reader.readAsDataURL(file);
                } else {
                    const filePreview = document.createElement('p');
                    filePreview.textContent = `File: ${file.name}`;
                    chatInputField.appendChild(filePreview);
                }
            });
        }
    });
});
