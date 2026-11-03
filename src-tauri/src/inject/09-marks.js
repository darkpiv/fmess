  // Marks for themes that don't depend on the language. Facebook translates
  // its aria-labels (a Vietnamese Facebook says "Tìm kiếm", not "Search"), so
  // a theme that only matched them worked in English. fMess marks the parts
  // themes style with data-fmess-ui, found by where they are and by their
  // icons: composer (the message box) and in it voice-clip, attach, sticker,
  // gif, more-actions (any other button there), emoji, like and send;
  // chat-header and in it audio-call, video-call and info (which shows the
  // details); details; list-menu (⋯ above the chat list); reactions (the
  // reaction picker) and in it more-emojis.
  const UI = 'data-fmess-ui';
  // The start of the path each icon begins with.
  const COMPOSER_ICONS = [
    ['M102 926.75 102 929', 'voice-clip'],
    ['M99.825 918.322', 'attach'],
    ['M106.617 923.049', 'sticker'],
    ['M460.25 1079a', 'gif'],
    ['M210.5,405 C209.121', 'emoji'],
  ];
  // Messenger's own like button, a thumbs-up (a chat's own one is an emoji picture).
  const THUMBS_UP = 'M16,9.1c';
  const mark = (el, name) => {
    if (el && el.getAttribute(UI) !== name) el.setAttribute(UI, name);
  };
  const markComposer = (composer) => {
    mark(composer, 'composer');
    // The bar above the box while replying, or with a link's preview.
    mark(composer.previousElementSibling, 'composer-bar');
    const field = [...composer.children].find((child) => child.querySelector('[role="textbox"]'));
    mark(field, 'composer-field');
    // The group of buttons before the box (voice clip, attach, sticker, GIF, "+").
    for (const child of composer.children) if (child !== field && child.tagName === 'DIV') mark(child, 'composer-tools');
    for (const button of composer.querySelectorAll('[role="button"]')) {
      const path = button.querySelector('svg path')?.getAttribute('d') ?? '';
      const icon = COMPOSER_ICONS.find(([start]) => path.startsWith(start))?.[1];
      // The last part holds the like button, or send once there is text.
      const end = composer.lastElementChild?.tagName === 'SPAN' && composer.lastElementChild.contains(button);
      const like = button.querySelector('img') || path.startsWith(THUMBS_UP);
      if (icon) mark(button, icon);
      else if (end) mark(button, like ? 'like' : 'send');
      else if (!field?.contains(button)) mark(button, 'more-actions');
    }
  };
  let markedInfo = null;
  function markUi(main, list, log, details) {
    const composer = main?.querySelector('[role="textbox"][contenteditable="true"]')?.closest('[role="region"]');
    if (composer) {
      markComposer(composer);
      watchComposer(composer);
    }
    mark(details, 'details');
    mark(list?.querySelector('[role="button"][aria-haspopup="menu"]:not([role="grid"] *)'), 'list-menu');
    // The header's button with aria-expanded opens the details; the calls are
    // the two buttons before it on the same line.
    if (log && !(markedInfo?.isConnected && main.contains(markedInfo))) {
      const info = [...main.querySelectorAll('[role="button"][aria-expanded]')].find(
        (button) => !log.contains(button) && !composer?.contains(button) && !details?.contains(button),
      );
      if (info) {
        markedInfo = info;
        mark(info, 'info');
        let header = info;
        while (header.parentElement && !header.parentElement.contains(log)) header = header.parentElement;
        mark(header, 'chat-header');
        const buttons = [...header.querySelectorAll('[role="button"]')];
        const top = info.getBoundingClientRect().top;
        const calls = buttons
          .slice(0, buttons.indexOf(info))
          .filter((button) => button.querySelector('svg') && Math.abs(button.getBoundingClientRect().top - top) < 8)
          .slice(-2);
        if (calls.length === 2) {
          mark(calls[0], 'audio-call');
          mark(calls[1], 'video-call');
        }
      }
    }
    markReactions();
    if (log) watchSenders(log);
  }
  // The picker is opened by a click and lives outside the chat.
  function markReactions() {
    for (const menu of document.querySelectorAll('[role="menu"]')) {
      if (!menu.querySelector('[role="menuitemradio"] img[alt]')) continue;
      mark(menu, 'reactions');
      mark(menu.querySelector('[role="button"]'), 'more-emojis');
    }
  }
  // Who wrote what. On the name heading over each group of messages:
  // data-fmess-sender="me" or "them", and data-fmess-sender-name with a full
  // name a theme can show (attr()): yours, or the other person's in a 1:1
  // chat. On each message's row the same two, the name there being your
  // handle (--fmess-handle, see 19-account) for yours and, for theirs, the
  // full name in a 1:1 chat or the group heading's text in a group; and
  // data-fmess-sender-repeat on a row by the same sender as the message
  // before it. Messenger writes "You sent" over yours, keeps a 1:1 chat's
  // name for screen readers only, and in a group shows its own name for each
  // sender. Your rows are the ones whose first column is the read receipt's;
  // the heading is in the group's first row or a row of its own before it.
  const OWN_COLUMN = ':scope > [role="presentation"]:first-child > [role="presentation"] > [role="none"]';
  const YOU_SENT = new Set(['You sent', 'Bạn đã gửi']);
  // A reply's heading says who replied to whom ("Toàn đã trả lời bạn",
  // "You replied to Toàn"): the row shows the sender and a short "trả lời"
  // / "replied" instead.
  const REPLIES = [
    [/^(.+?) đã trả lời\b/, ' trả lời', 'Bạn'],
    [/^(.+?) replied to\b/, ' replied', 'You'],
  ];
  const readHeading = (text) => {
    for (const [pattern, reply, you] of REPLIES) {
      const found = text.match(pattern);
      if (found) return { name: found[1], reply, you: found[1] === you };
    }
    return { name: text, reply: '', you: YOU_SENT.has(text) };
  };
  // A chat's id: the other person's full name in a 1:1 chat, '' in a group.
  const otherNames = new Map();
  const chatId = () => location.pathname.match(/^\/messages\/(?:e2ee\/)?t\/(\d+)/)?.[1] ?? null;
  async function readOtherName(id) {
    await loadModules(['ReQL', 'LSDatabaseSingleton', 'LSMessagingThreadTypeUtil']);
    const db = await window.require('LSDatabaseSingleton').LSDatabaseSingleton;
    const ReQL = window.require('ReQL');
    const thread = await ReQL.firstAsync(ReQL.fromTableAscending(db.tables.threads).getKeyRange(int64Key(id)));
    if (!thread) return null;
    if (window.require('LSMessagingThreadTypeUtil').isGroup(thread.threadType)) return '';
    // A 1:1 chat's id is the other person's.
    return (await db.tables.contacts.get(int64Key(id)))?.name || null;
  }
  const myName = () => {
    try {
      return window.require('CurrentUserInitialData').NAME || '';
    } catch {
      return '';
    }
  };
  const myHandle = () => document.documentElement.style.getPropertyValue('--fmess-handle').replace(/"/g, '') || myName();
  const setAttr = (el, name, value) => {
    if (value == null) el.removeAttribute(name);
    else if (el.getAttribute(name) !== value) el.setAttribute(name, value);
  };
  // When each message was sent, as data-fmess-time="14:32" (24-hour, local)
  // on its row: Messenger's page shows a time only on hover, so it is read
  // from its messages table for the open chat (the newest 1000), and read
  // again when the chat shows a message not read yet, at most every 3s.
  const messageTimes = new Map();
  let timesChat = null;
  let timesReadAt = 0;
  let readingTimes = false;
  // Ids looked for and not found (a chat whose messages aren't in the table):
  // not read again for them, only for new ones.
  const timesTried = new Set();
  async function readTimes(id) {
    readingTimes = true;
    timesReadAt = Date.now();
    try {
      await loadModules(['ReQL', 'LSDatabaseSingleton']);
      const db = await window.require('LSDatabaseSingleton').LSDatabaseSingleton;
      const ReQL = window.require('ReQL');
      const rows = await ReQL.toArrayAsync(ReQL.fromTableDescending(db.tables.messages).getKeyRange(int64Key(id)).take(1000));
      if (timesChat !== id) return;
      for (const row of rows) if (row.messageId) messageTimes.set(String(row.messageId), Number(int64(row.timestampMs)));
      markSendersSoon();
    } finally {
      readingTimes = false;
    }
  }
  const CONTENT = '[dir="auto"]:not(h4 *), img:not(h4 *), video, [role="img"]';
  const REACTION_PILL = '[role="button"] > span > div[role="none"] > div > div > span > img';
  const ROW_MARKS = ['data-fmess-sender', 'data-fmess-sender-name', 'data-fmess-sender-repeat', 'data-fmess-time'];
  const clock = (ms) => {
    const at = new Date(ms);
    return `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
  };
  // Messenger draws the composer's buttons again as you type and stop: they
  // are marked again at once (a MutationObserver runs before the next
  // paint), so a theme can rely on the marks without a flash.
  let watchedComposer = null;
  const composerObserver = new MutationObserver(() => watchedComposer?.isConnected && markComposer(watchedComposer));
  function watchComposer(composer) {
    if (watchedComposer === composer) return;
    composerObserver.disconnect();
    watchedComposer = composer;
    composerObserver.observe(composer, { childList: true, subtree: true });
  }
  // The chat's marks are redone when it changes (new rows, a reaction, more
  // history), once per frame before it is painted, and when a name or the
  // times come in; not every second.
  let watchedLog = null;
  let sendersDirty = true;
  let sendersFrame = 0;
  const markSendersSoon = () => {
    sendersDirty = true;
    sendersFrame ||= requestAnimationFrame(() => {
      sendersFrame = 0;
      if (watchedLog?.isConnected) {
        sendersDirty = false;
        markSenders(watchedLog);
      }
    });
  };
  const logObserver = new MutationObserver(markSendersSoon);
  function watchSenders(log) {
    if (watchedLog !== log) {
      logObserver.disconnect();
      watchedLog = log;
      logObserver.observe(log, { childList: true, subtree: true });
      markSendersSoon();
    } else if (sendersDirty) markSendersSoon();
  }
  function markSenders(log) {
    const id = chatId();
    if (id && !otherNames.has(id)) {
      otherNames.set(id, null);
      readOtherName(id)
        .then((name) => (otherNames.set(id, name), markSendersSoon()))
        .catch(() => otherNames.delete(id));
    }
    const other = id ? otherNames.get(id) : null;
    if (id !== timesChat) {
      timesChat = id;
      messageTimes.clear();
      timesTried.clear();
      timesReadAt = 0;
    }
    const timeMissing = [];
    const me = myName();
    const handle = myHandle();
    // The last group heading's sender, and the last message's, in order down the chat.
    let groupName = null;
    let groupReply = '';
    let groupOwn = null;
    let last = null;
    const marked = new Set();
    for (const row of log.querySelectorAll('[data-scope="messages_table"] > *')) {
      const heading = row.querySelector('h4');
      // The message id is on an element around several rows (the hidden
      // heading, the message, its status) or inside one: only the first row
      // of a message that holds its content (text, a picture, a video) gets
      // the marks, not a heading's row.
      const message = row.closest('[data-message-id]') ?? row.querySelector('[data-message-id]');
      const messageId = message?.getAttribute('data-message-id');
      const holdsContent = Boolean(row.querySelector(CONTENT));
      const content = message && !marked.has(messageId) && row.getAttribute('role') === 'presentation' && holdsContent;
      // Rows a theme spaces differently: with a date, with reaction pills.
      setAttr(row, 'data-fmess-date', row.querySelector('[data-scope="date_break"]') ? '' : null);
      setAttr(row, 'data-fmess-reacted', row.querySelector(REACTION_PILL) ? '' : null);
      if (heading) {
        const text = heading.textContent.trim();
        const read = readHeading(text);
        groupReply = read.reply;
        const own =
          read.you ||
          // A heading in its message's row is that message's; one in a row
          // of its own, the next row's.
          Boolean(row.querySelector(OWN_COLUMN) || (!holdsContent && row.nextElementSibling?.querySelector(OWN_COLUMN)));
        setAttr(heading, 'data-fmess-sender', own ? 'me' : 'them');
        setAttr(heading, 'data-fmess-sender-name', own ? me || null : other || null);
        groupName = own ? null : other || read.name || null;
        groupOwn = own;
      }
      if (!content) {
        // A date between messages starts a new run of names.
        if (row.hasAttribute('data-fmess-date')) last = null;
        for (const name of ROW_MARKS) row.removeAttribute(name);
        continue;
      }
      marked.add(messageId);
      // Messenger writes a heading at each change of sender, so the last
      // heading says whose a message is; a row's read-receipt column only
      // before the first heading (not every row of yours has it).
      const own = groupOwn ?? Boolean(row.querySelector(OWN_COLUMN));
      const name = (own ? handle : other || groupName || '?') + groupReply;
      // A reply's heading is over that one message.
      groupReply = '';
      const key = (own ? 'me:' : 'them:') + name;
      setAttr(row, 'data-fmess-sender', own ? 'me' : 'them');
      setAttr(row, 'data-fmess-sender-name', name);
      setAttr(row, 'data-fmess-sender-repeat', key === last ? '' : null);
      last = key;
      const sent = messageTimes.get(messageId);
      setAttr(row, 'data-fmess-time', sent ? clock(sent) : null);
      if (!sent && !timesTried.has(messageId)) timeMissing.push(messageId);
    }
    if (id && timeMissing.length && !readingTimes) {
      const wait = 3000 - (Date.now() - timesReadAt);
      if (wait > 0) setTimeout(markSendersSoon, wait);
      else {
        for (const missing of timeMissing) timesTried.add(missing);
        readTimes(id).catch(() => {});
      }
    }
  }
  // Typing turns the like button into send.
  let typedFrame = 0;
  document.addEventListener(
    'input',
    (event) => {
      const composer = event.target instanceof Element && event.target.closest(`[${UI}="composer"]`);
      if (composer) typedFrame ||= requestAnimationFrame(() => ((typedFrame = 0), markComposer(composer)));
    },
    { capture: true, passive: true },
  );

