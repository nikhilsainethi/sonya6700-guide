/* a6700 Field Manual — Chapter 00 data.
   Part names and default functions follow Sony's ILCE-6700 Help Guide
   ("Names of parts", "Control wheel", "Front dial and rear dial", exposure-mode pages).
   view = [yaw°, pitch°, distance]: how the model turns to show the control. */

export const FACES = ['Top', 'Back', 'Front', 'Sides and bottom'];

export const CONTROLS = {
  /* ── top ── */
  power: {
    name: 'ON/OFF switch', face: 'Top', view: [28, 46, 290],
    where: 'Top of the grip. It is the collar around the shutter button.',
    what: 'Turns the camera on and off. Flick it with your index finger.',
    facts: [['Good habit', 'Switch off before you change lenses or take the battery out.']],
  },
  shutter: {
    name: 'Shutter button', face: 'Top', view: [28, 46, 290],
    where: 'Top of the grip, under your index finger.',
    what: 'Takes the picture. It has two stages, and the first one matters as much as the second.',
    facts: [['Half-press', 'The camera focuses and measures the light. Hold it there.'], ['Full press', 'The photo is taken. Squeeze, don\'t jab.']],
  },
  c2: {
    name: 'C2 button', face: 'Top', view: [180, 60, 280],
    where: 'Top of the grip, beside the shutter button.',
    what: 'Custom button 2. A spare button whose job you choose yourself.',
    facts: [['Set it in', 'MENU, then Custom Key/Dial Set.'], ['Idea', 'Give it something you change often, such as Focus Area.']],
  },
  movie: {
    name: 'MOVIE button', face: 'Top', view: [180, 60, 280],
    where: 'Top of the grip, beside the C2 button. It is the one marked with a red dot.',
    what: 'Starts video recording. Press it again to stop.',
  },
  modeDial: {
    name: 'Mode dial', face: 'Top', view: [180, 56, 280],
    where: 'On top, to the right of the accessory shoe. The taller dial with letters on it.',
    what: 'Chooses how much the camera decides for you.',
    facts: [['AUTO', 'The camera sets everything.'], ['P', 'Camera sets aperture and shutter; you can still adjust brightness and ISO.'], ['A', 'You set the aperture. Start here.'], ['S', 'You set the shutter speed.'], ['M', 'You set both.'], ['1 2 3', 'Recall complete setups you have saved.']],
  },
  smsDial: {
    name: 'Still/Movie/S&Q dial', face: 'Top', view: [180, 56, 280],
    where: 'Directly underneath the mode dial: a flat ring with a small lever.',
    what: 'Switches the whole camera between three kinds of shooting. The mode dial above it then works within whichever one you picked.',
    facts: [['Still', 'Photographs.'], ['Movie', 'Video.'], ['S&Q', 'Slow-motion and quick-motion video.']],
  },
  rearDial: {
    name: 'Rear dial', face: 'Top', view: [186, 44, 280],
    where: 'Top right corner at the back, where your thumb reaches it.',
    what: 'A second dial for your thumb. What it changes depends on the mode.',
    facts: [['In M', 'Shutter speed (the front dial handles aperture).'], ['In A', 'Aperture, same as the front dial.'], ['In S', 'Shutter speed, same as the front dial.'], ['Playback', 'Flicks through your photos.']],
  },
  shoe: {
    name: 'Multi Interface Shoe', face: 'Top', view: [180, 60, 320],
    where: 'On top, left of the mode dial. The metal bracket with rails.',
    what: 'Where a flash or an external microphone slides on. The a6700 has no built-in flash, so this is how you add one.',
  },

  /* ── back ── */
  evf: {
    name: 'Viewfinder', face: 'Back', view: [180, 10, 300],
    where: 'Top left corner of the back.',
    what: 'A small screen you hold up to your eye. A sensor beside the eyepiece notices your face and switches the picture over from the monitor automatically.',
    facts: [['Use it when', 'The sun makes the rear screen hard to see. Snow days, mostly.']],
  },
  diopter: {
    name: 'Diopter-adjustment dial', face: 'Back', view: [180, 12, 250],
    where: 'On the viewfinder housing, right beside the eyepiece.',
    what: 'Focuses the viewfinder for your own eyesight. It has no effect on your photos.',
    facts: [['Set it once', 'Look through the viewfinder and turn the dial until the numbers look sharp.']],
  },
  monitor: {
    name: 'Monitor', face: 'Back', view: [180, 5, 360],
    where: 'Most of the back. It swings out sideways and rotates.',
    what: 'Shows the live picture, the menus and your photos. It is a touch screen.',
    facts: [['Touch', 'With touch operation switched on, tap a subject to focus on it.'], ['Flip it', 'Turn it inwards to protect the glass when the camera is in a bag.']],
  },
  menu: {
    name: 'MENU button', face: 'Back', view: [180, 12, 280],
    where: 'Back, along the top edge, just right of the viewfinder.',
    what: 'Opens the full menu, where every setting lives. Move around with the control wheel and press its centre to choose.',
  },
  afon: {
    name: 'AF-ON button', face: 'Back', view: [180, 12, 270],
    where: 'Back, top right, beside where your thumb rests.',
    what: 'Focuses when you press it, without touching the shutter button.',
    facts: [['Shooting', 'Autofocus on demand, under your thumb.'], ['Playback', 'Enlarges the photo so you can check it is sharp.']],
  },
  c1: {
    name: 'C1 button', face: 'Sides and bottom', view: [116, 16, 280],
    where: 'Right-hand side of the body, on the outer edge of the thumb rest.',
    what: 'Custom button 1. Like C2, a spare button you assign yourself.',
    facts: [['Set it in', 'MENU, then Custom Key/Dial Set.']],
  },
  fn: {
    name: 'Fn button', face: 'Back', view: [180, 6, 260],
    where: 'Back, right of the screen, just above the control wheel.',
    what: 'The shortcut button. It opens a grid of the settings you change most, so you rarely need the full menu.',
    facts: [['Shooting', 'Opens the Function menu.'], ['Playback', 'Send to Smartphone: transfers the photo on screen.']],
  },
  wheel: {
    name: 'Control wheel', face: 'Back', view: [180, 2, 250],
    where: 'Back, right of the screen. The round dial under your thumb.',
    what: 'Three controls in one. It turns to scroll through values, its four edges click as buttons, and its centre confirms.',
    facts: [['Top edge', 'DISP: changes what the screen shows.'], ['Right edge', 'ISO.'], ['Left edge', 'Drive mode: single shot, burst, self-timer.'], ['Bottom edge', 'Exposure compensation.'], ['Centre', 'Confirms your choice.']],
  },
  wheelUp: {
    name: 'DISP (wheel, top edge)', face: 'Back', view: [180, 2, 240],
    where: 'The top edge of the control wheel. Press it, don\'t turn.',
    what: 'Changes how much information is laid over the picture. Each press moves to the next layout, including one with a histogram.',
  },
  wheelRight: {
    name: 'ISO (wheel, right edge)', face: 'Back', view: [180, 2, 240],
    where: 'The right edge of the control wheel.',
    what: 'Opens the ISO setting. Then turn the wheel to choose a value, or AUTO.',
  },
  wheelLeft: {
    name: 'Drive mode (wheel, left edge)', face: 'Back', view: [180, 2, 240],
    where: 'The left edge of the control wheel.',
    what: 'Chooses what one press of the shutter does: a single photo, a continuous burst, or a self-timer countdown.',
  },
  wheelDown: {
    name: 'Exposure comp. (wheel, bottom edge)', face: 'Back', view: [180, 2, 240],
    where: 'The bottom edge of the control wheel.',
    what: 'The ± control. Makes the picture brighter or darker than the camera would choose. This is the snow button.',
    facts: [['Shooting', 'Exposure compensation.'], ['Playback', 'Image index: shows your photos as a grid.']],
  },
  wheelCenter: {
    name: 'Centre button', face: 'Back', view: [180, 2, 240],
    where: 'The middle of the control wheel.',
    what: 'Confirms whatever is highlighted, in menus and in every setting screen.',
  },
  playback: {
    name: 'Playback button', face: 'Back', view: [180, -4, 250],
    where: 'Back, bottom right, below the control wheel.',
    what: 'Shows the photos you have taken. Press it again, or half-press the shutter, to go back to shooting.',
  },
  del: {
    name: 'C3 / Delete button', face: 'Back', view: [180, -4, 250],
    where: 'Back, bottom right, next to the Playback button. Marked with a bin.',
    what: 'One button, two jobs depending on what the camera is doing.',
    facts: [['Playback', 'Deletes the photo on screen, after asking you to confirm.'], ['Shooting', 'Custom button 3, yours to assign.']],
  },

  /* ── front ── */
  frontDial: {
    name: 'Front dial', face: 'Front', view: [34, 20, 280],
    where: 'Front of the grip, just below the shutter button, under your index finger.',
    what: 'The dial you will use most. It changes the main setting for whichever mode you are in.',
    facts: [['In A', 'Aperture.'], ['In S', 'Shutter speed.'], ['In M', 'Aperture (the rear dial handles shutter speed).'], ['Playback', 'Flicks through your photos.']],
  },
  afLamp: {
    name: 'Self-timer lamp / AF illuminator', face: 'Front', view: [20, 12, 290],
    where: 'Front, between the grip and the lens.',
    what: 'A small light with two jobs. It blinks during the self-timer countdown, and it shines briefly to help the camera focus when the light is dim.',
  },
  lensRelease: {
    name: 'Lens release button', face: 'Front', view: [-24, 2, 290],
    where: 'Front, right beside the lens mount.',
    what: 'Unlocks the lens. Hold it in while you twist the lens off.',
  },
  mount: {
    name: 'Mount and image sensor', face: 'Front', view: [-10, 4, 290], lens: false,
    where: 'Front, behind the lens. Take the lens off to see it.',
    what: 'The metal ring is the mount the lens locks onto. The rectangle behind it is the sensor, the part that actually records the picture.',
    facts: [['Never', 'Touch the sensor or the row of gold contacts.'], ['Dust', 'Keep a lens or the body cap on. Change lenses with the camera pointing down.']],
  },
  lens: {
    name: 'Lens', face: 'Front', view: [-34, 12, 400],
    where: 'On the front. Shown here: the Sigma 18–50mm.',
    what: 'Twist the wide ribbed ring to zoom in and out. The narrow ring at the front focuses by hand, which you will rarely need.',
  },

  /* ── sides and bottom ── */
  card: {
    name: 'Memory card slot', face: 'Sides and bottom', view: [-104, 6, 310],
    where: 'Left side as you hold the camera, behind a cover.',
    what: 'Takes one SD card. A small access lamp nearby glows while the camera is writing; don\'t pull the card out until it goes dark.',
  },
  ports: {
    name: 'Terminals', face: 'Sides and bottom', view: [-104, -4, 310],
    where: 'Left side as you hold the camera, behind the covers.',
    what: 'The sockets for cables.',
    facts: [['USB Type-C', 'Charges the battery in the camera and copies files to a computer.'], ['HDMI micro', 'Shows the picture on a TV or monitor.'], ['Microphone', 'For an external microphone.'], ['Headphones', 'To listen while recording video.']],
  },
  strap: {
    name: 'Strap hooks', face: 'Sides and bottom', view: [-62, 30, 330],
    where: 'One on each side of the body, near the top.',
    what: 'Where the shoulder strap attaches. Use both.',
  },
  battery: {
    name: 'Battery compartment', face: 'Sides and bottom', view: [8, -68, 330],
    where: 'Underneath the grip, behind the battery cover.',
    what: 'Holds the NP-FZ100 battery. A small lock lever inside keeps the battery in; push it aside and the battery springs out.',
    facts: [['In the cold', 'Keep a spare battery warm in an inside pocket.']],
  },
  tripod: {
    name: 'Tripod socket', face: 'Sides and bottom', view: [8, -68, 330],
    where: 'Underneath, in line with the lens.',
    what: 'A standard 1/4-inch thread. Any ordinary tripod or plate screws in here.',
  },
};

/* step: c = control id, do = instruction, plus optional model state:
   dial 'AUTO'|'P'|'A'|'S'|'M', sms 'still'|'movie'|'sq', lcd screen mode, lens false = lens removed */
export const TASKS = [
  { id: 'on', group: 'Start here', title: 'Switch it on',
    intro: 'The power switch is wrapped around the shutter button so one finger does both.',
    steps: [{ c: 'power', do: '<b>Flick the collar to ON</b> with your index finger. The screen lights up.', lcd: 'live' }] },
  { id: 'shoot', group: 'Start here', title: 'Take a photo',
    intro: 'Three controls, in order. After the first week you will only touch the last one.',
    steps: [
      { c: 'smsDial', do: '<b>Set the lower ring to the still-photo position</b> so the camera is taking pictures, not video.', sms: 'still' },
      { c: 'modeDial', do: '<b>Turn the mode dial to A.</b> Or to AUTO if you want the camera to decide everything for now.', dial: 'A', sms: 'still' },
      { c: 'shutter', do: '<b>Press halfway and hold.</b> The camera focuses. <b>Then press all the way down</b>, gently.', dial: 'A', lcd: 'focus' },
    ] },
  { id: 'mode', group: 'Start here', title: 'Pick a shooting mode',
    intro: 'Two dials stacked on one axle. The bottom one chooses photo or video; the top one chooses how much you control.',
    steps: [
      { c: 'smsDial', do: '<b>Lower ring:</b> still photos, movie, or S&Q (slow and quick motion).', sms: 'still' },
      { c: 'modeDial', do: '<b>Upper dial:</b> AUTO, P, A, S or M. Leave it on A for your first month.', dial: 'A' },
    ] },
  { id: 'evf', group: 'Start here', title: 'Use the viewfinder',
    intro: 'In bright snow the rear screen washes out. The viewfinder doesn\'t.',
    steps: [
      { c: 'evf', do: '<b>Lift the camera to your eye.</b> The picture moves from the monitor to the viewfinder by itself.' },
      { c: 'diopter', do: '<b>Turn this small dial</b> until the numbers inside the viewfinder look sharp. You only do this once.' },
    ] },
  { id: 'disp', group: 'Start here', title: 'Show the histogram',
    intro: 'The histogram is the graph the Snow chapter tells you to trust. It is one of the screen layouts.',
    steps: [{ c: 'wheelUp', do: '<b>Press the top edge of the control wheel (DISP).</b> Each press changes the layout. Keep pressing until the graph appears.', lcd: 'histo' }],
    more: ['index.html#snow', 'Why the histogram matters'] },

  { id: 'aperture', group: 'Exposure', title: 'Blur the background',
    intro: 'Aperture is the size of the hole in the lens. A low f-number blurs the background.',
    steps: [
      { c: 'modeDial', do: '<b>Turn the mode dial to A</b> (aperture priority).', dial: 'A' },
      { c: 'frontDial', do: '<b>Roll the front dial</b> with your index finger. Watch the F number change: low for blur, high for everything sharp.', dial: 'A', lcd: 'f' },
    ],
    more: ['index.html#exposure', 'Try it in the exposure simulator'] },
  { id: 'shutter', group: 'Exposure', title: 'Freeze or blur motion',
    intro: 'Shutter speed is how long the camera looks. Fast freezes, slow smears.',
    steps: [
      { c: 'modeDial', do: '<b>Turn the mode dial to S</b> (shutter priority).', dial: 'S' },
      { c: 'frontDial', do: '<b>Roll the front dial.</b> 1/1000 freezes a skier; 1/30 turns falling snow into streaks.', dial: 'S', lcd: 'ss' },
    ],
    more: ['index.html#exposure', 'Try it in the exposure simulator'] },
  { id: 'manual', group: 'Exposure', title: 'Set both yourself',
    intro: 'Manual mode gives each of your two fingers its own dial.',
    steps: [
      { c: 'modeDial', do: '<b>Turn the mode dial to M.</b>', dial: 'M' },
      { c: 'frontDial', do: '<b>Front dial, index finger: aperture.</b>', dial: 'M', lcd: 'f' },
      { c: 'rearDial', do: '<b>Rear dial, thumb: shutter speed.</b> Watch the ± scale on screen and aim for zero.', dial: 'M', lcd: 'ss' },
    ] },
  { id: 'iso', group: 'Exposure', title: 'Change ISO',
    intro: 'ISO brightens the picture without more light, at the cost of grain. It has its own shortcut.',
    steps: [
      { c: 'wheelRight', do: '<b>Press the right edge of the control wheel</b>, marked ISO.', lcd: 'iso' },
      { c: 'wheel', do: '<b>Turn the wheel</b> to pick a number, or AUTO to let the camera choose.', lcd: 'iso' },
      { c: 'wheelCenter', do: '<b>Press the centre</b> to confirm.', lcd: 'iso' },
    ] },
  { id: 'ev', group: 'Exposure', title: 'Make it brighter or darker',
    intro: 'Exposure compensation, the ± control. In snow, this is the one that turns grey back into white.',
    steps: [
      { c: 'wheelDown', do: '<b>Press the bottom edge of the control wheel</b>, marked ±.', lcd: 'ev' },
      { c: 'wheel', do: '<b>Turn the wheel</b> towards + to brighten. For snow, start at +1.', lcd: 'ev' },
      { c: 'wheelCenter', do: '<b>Press the centre</b> to confirm. Remember to set it back to 0 afterwards.', lcd: 'ev' },
    ],
    more: ['index.html#snow', 'Why snow needs +1'] },

  { id: 'afon', group: 'Focus and shooting', title: 'Focus with your thumb',
    intro: 'You can focus without touching the shutter button at all.',
    steps: [{ c: 'afon', do: '<b>Hold AF-ON with your thumb.</b> The camera focuses and, in AF-C, keeps following the subject for as long as you hold it.', lcd: 'focus' }] },
  { id: 'touch', group: 'Focus and shooting', title: 'Choose what to focus on',
    intro: 'The quickest way to tell the camera what matters is to point at it.',
    steps: [{ c: 'monitor', do: '<b>Tap the subject on the screen.</b> With touch operation switched on, the camera focuses there.', lcd: 'focus' }] },
  { id: 'drive', group: 'Focus and shooting', title: 'Burst or self-timer',
    intro: 'Drive mode decides what one press of the shutter does.',
    steps: [
      { c: 'wheelLeft', do: '<b>Press the left edge of the control wheel.</b>', lcd: 'drive' },
      { c: 'wheel', do: '<b>Turn the wheel</b> to choose single shot, continuous shooting or a self-timer.', lcd: 'drive' },
      { c: 'wheelCenter', do: '<b>Press the centre</b> to confirm.', lcd: 'drive' },
    ] },
  { id: 'fn', group: 'Focus and shooting', title: 'Reach common settings fast',
    intro: 'The Function menu is a grid of the settings people change most. Learn this before the full menu.',
    steps: [
      { c: 'fn', do: '<b>Press Fn.</b> A grid of settings appears over the picture.', lcd: 'fn' },
      { c: 'wheel', do: '<b>Press the edges of the wheel</b> to move to the setting you want.', lcd: 'fn' },
      { c: 'frontDial', do: '<b>Roll the front dial</b> to change it on the spot, or press the wheel\'s centre to open it fully.', lcd: 'fn' },
    ] },
  { id: 'menu', group: 'Focus and shooting', title: 'Open the full menu',
    intro: 'Everything else lives here: File Format, Focus Area, Zebra Display, Grid Line Display and hundreds more.',
    steps: [
      { c: 'menu', do: '<b>Press MENU.</b>', lcd: 'menu' },
      { c: 'wheel', do: '<b>Press the wheel\'s edges</b> to move between sections and items. Turning it scrolls.', lcd: 'menu' },
      { c: 'wheelCenter', do: '<b>Press the centre</b> to open an item and again to confirm. MENU steps back out.', lcd: 'menu' },
    ],
    more: ['index.html#setup', 'The twelve settings worth changing'] },

  { id: 'play', group: 'Review and video', title: 'Look at your photos',
    intro: 'Check sharpness on the spot, not when you get home.',
    steps: [
      { c: 'playback', do: '<b>Press Playback.</b> Your latest photo appears.', lcd: 'play' },
      { c: 'wheel', do: '<b>Turn the wheel</b> to move through your photos.', lcd: 'play' },
      { c: 'afon', do: '<b>Press AF-ON to enlarge</b> and check the eyes are sharp.', lcd: 'zoom' },
      { c: 'shutter', do: '<b>Half-press the shutter</b> to jump straight back to shooting.', lcd: 'live' },
    ] },
  { id: 'delete', group: 'Review and video', title: 'Delete a photo',
    intro: 'The camera always asks before it deletes.',
    steps: [
      { c: 'playback', do: '<b>Press Playback</b> and find the photo.', lcd: 'play' },
      { c: 'del', do: '<b>Press the button marked with a bin.</b>', lcd: 'delete' },
      { c: 'wheelCenter', do: '<b>Choose Delete and press the centre</b> to confirm.', lcd: 'delete' },
    ] },
  { id: 'phone', group: 'Review and video', title: 'Send a photo to your phone',
    intro: 'Needs Sony\'s Creators\' App on your phone, paired with the camera once.',
    steps: [
      { c: 'playback', do: '<b>Press Playback</b> and find the photo.', lcd: 'play' },
      { c: 'fn', do: '<b>Press Fn.</b> During playback it becomes Send to Smartphone.', lcd: 'play' },
    ] },
  { id: 'video', group: 'Review and video', title: 'Record a video',
    intro: 'Two controls: tell the camera you want video, then start it.',
    steps: [
      { c: 'smsDial', do: '<b>Move the lower ring to the movie position.</b>', sms: 'movie', lcd: 'live' },
      { c: 'movie', do: '<b>Press MOVIE to start.</b> Press it again to stop.', sms: 'movie', lcd: 'rec' },
    ] },

  { id: 'lens', group: 'Looking after it', title: 'Change the lens',
    intro: 'Do it indoors or with your back to the wind, camera pointing down, and never in falling snow.',
    steps: [
      { c: 'power', do: '<b>Switch the camera off.</b>', lcd: 'off' },
      { c: 'lensRelease', do: '<b>Hold the lens release button in</b> and twist the lens until it stops, then lift it away.', lcd: 'off' },
      { c: 'mount', do: '<b>Don\'t touch anything in here.</b> That rectangle is the sensor. Get the other lens on quickly.', lens: false, lcd: 'off' },
      { c: 'lens', do: '<b>Line up the white marks</b> on the lens and the mount, push together, and twist until it clicks.', lcd: 'off' },
    ],
    more: ['index.html#lenses', 'Which lens for which job'] },
  { id: 'card', group: 'Looking after it', title: 'Put the memory card in',
    intro: 'The a6700 takes one SD card, and it goes in the side, not the bottom.',
    steps: [{ c: 'card', do: '<b>Open the cover on the left side</b> and push the card in until it clicks. Press it again to release.' }] },
  { id: 'battery', group: 'Looking after it', title: 'Change or charge the battery',
    intro: 'You can swap the battery, or charge it without taking it out.',
    steps: [
      { c: 'battery', do: '<b>Open the cover under the grip.</b> Push the small lock lever aside and the battery pops up.' },
      { c: 'ports', do: '<b>Or plug a USB-C cable in here</b> to charge the battery inside the camera.' },
    ] },
  { id: 'tripod', group: 'Looking after it', title: 'Mount it on a tripod',
    intro: 'For slow shutter speeds, self-portraits and night skies.',
    steps: [{ c: 'tripod', do: '<b>Screw the tripod plate in here.</b> Finger-tight is enough.' }] },
  { id: 'custom', group: 'Looking after it', title: 'Find the custom buttons',
    intro: 'Three buttons are yours to assign in MENU under Custom Key/Dial Set. Here is where they are.',
    steps: [
      { c: 'c1', do: '<b>C1</b> is on the side of the body, at the outer edge of the thumb rest.' },
      { c: 'c2', do: '<b>C2</b> is on top of the grip, beside the shutter button.' },
      { c: 'del', do: '<b>C3</b> is the Delete button. It only deletes during playback, so while shooting it is free.' },
    ] },
];
