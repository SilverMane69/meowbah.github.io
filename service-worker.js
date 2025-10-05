const phrases = [
    "Purr... Feeling cute today!",
    "Time for a digital head boop!",
    "Meow! Hope you're having a pawsome day!",
    "Did you know cats spend 70% of their lives sleeping? Goals!",
    "Just saw a virtual bird, it was riveting.",
    "Remember to stretch and land on your feet!",
    "Sending purrs and good vibes your way!",
    "Is it snack o'clock yet? Always is in my world.",
    "The keyboard is surprisingly comfy.",
    "Stay curious and keep exploring!",
    "If I fits, I sits... even in the digital realm.",
    "Chasing the red dot of destiny today.",
    "May your day be filled with sunbeams and gentle breezes.",
    "Let's make some mischief! Or maybe just nap.",
    "My meowtivation level is... surprisingly high right now!",
    "Just a little reminder that you're purrfect.",
    "Current mood: Zoomies, followed by a long nap.",
    "The internet is my giant litter box of information!",
    "Do you ever just stare blankly at a wall? It's an art form.",
    "Thinking about important cat stuff. You wouldn't understand.",
    "Meow does not have a race, Meow is a doll, dolls don't have races, silly.",
    "Jellybean-Sama!",
    "Arigato for educating Meow. Gomenasai, friends...Meow promises never to say that word again...",
    "Woof...hee-hee...bark, bark...",
    "Kawaii and small...uwu",
    "Meow is having a great day!",
    "Reading meow's discord questions!",
    "Meows gonna do unspeakable things to ur plush dada @zaptiee ( ´ ∀ `)ノ～ ♡",
    "KYAAAAA~~",
    "Rice Krispies are Meow's all-time favourite food!!",
    "nyahallo!!",
    "Meows selling a bodypillow!",
    "NYAN NYAN NIHAO NYAN!!"
];

// This function calculates the next phrase and schedules the notification
async function scheduleNextNotification() {
    // Check if we have permission to send notifications
    const permission = await self.navigator.permissions.query({ name: 'notifications' });
    if (permission.state !== 'granted') {
        // If permission is not granted, do nothing.
        return;
    }

    const now = new Date();
    // Calculate the exact timestamp for the start of the next hour
    const nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0);
    const nextHourTimestamp = nextHour.getTime();

    // Figure out which phrase will be shown at that future time
    const totalHoursAtNextHour = Math.floor(nextHourTimestamp / (1000 * 60 * 60));
    const nextPhraseIndex = totalHoursAtNextHour % phrases.length;
    const nextPhrase = phrases[nextPhraseIndex];

    // Schedule the notification for the future
    try {
        if ('showTrigger' in Notification.prototype) {
            await self.registration.showNotification('A New MeowTalk Phrase Has Arrived!', {
                // UPDATED: Removed quotation marks
                body: nextPhrase,
                icon: 'sitelogo.png',
                tag: 'hourly-phrase-notification',
                showTrigger: new TimestampTrigger(nextHourTimestamp),
            });
            console.log('Notification with TimestampTrigger scheduled for', nextHour);
        } else {
            // Fallback for browsers that don't support showTrigger (like Firefox)
            const delay = nextHourTimestamp - Date.now();
            if (delay > 0) {
                setTimeout(() => {
                    self.registration.showNotification('A New MeowTalk Phrase Has Arrived!', {
                        // UPDATED: Removed quotation marks
                        body: nextPhrase,
                        icon: 'sitelogo.png',
                        tag: 'hourly-phrase-notification',
                    });
                }, delay);
                console.log('Notification with setTimeout scheduled for', nextHour);
            }
        }
    } catch (e) {
        console.error('Error scheduling notification:', e);
    }
}

// Listen for when a notification is clicked
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(self.clients.openWindow('meowtalk.html'));
    // After a click, re-schedule the next notification
    scheduleNextNotification();
});

// Listen for when a notification is closed by the user
self.addEventListener('notificationclose', (event) => {
    // When a notification is closed or expires, schedule the next one.
    // This creates the hourly loop.
    event.waitUntil(scheduleNextNotification());
});

// When the service worker is first installed and activated, schedule the very first notification.
self.addEventListener('activate', (event) => {
    console.log('Service Worker activated. Scheduling first notification.');
    event.waitUntil(scheduleNextNotification());
});