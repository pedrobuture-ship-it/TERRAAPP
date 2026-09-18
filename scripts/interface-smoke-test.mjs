import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';

const BASE_URL = process.env.TERRA_TEST_URL ?? 'http://127.0.0.1:4173';
const EDGE_PATH = process.env.EDGE_PATH ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const DB_NAME = 'fazenda_cria_offline_db';
const results = [];
const findings = [];

function log(status, name, detail = '') {
  results.push({ status, name, detail });
  console.log(`${status} ${name}${detail ? ` - ${detail}` : ''}`);
}

function pass(name, detail = '') {
  log('PASS', name, detail);
}

function fail(name, detail = '') {
  log('FAIL', name, detail);
}

function warn(name, detail = '') {
  log('WARN', name, detail);
}

function assert(condition, name, detail = '') {
  if (!condition) {
    throw new Error(`${name}${detail ? `: ${detail}` : ''}`);
  }
  pass(name, detail);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: options.method ?? 'GET' }, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
    server.on('error', reject);
  });
}

class RawWebSocket {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.buffer = Buffer.alloc(0);
    this.messageHandlers = [];
    this.closeHandlers = [];
  }

  connect() {
    return new Promise((resolve, reject) => {
      const url = new URL(this.wsUrl);
      const key = randomBytes(16).toString('base64');
      const socket = net.createConnection(Number(url.port), url.hostname);
      this.socket = socket;

      let handshake = Buffer.alloc(0);

      socket.once('error', reject);
      socket.on('connect', () => {
        socket.write(
          [
            `GET ${url.pathname}${url.search} HTTP/1.1`,
            `Host: ${url.host}`,
            'Upgrade: websocket',
            'Connection: Upgrade',
            `Sec-WebSocket-Key: ${key}`,
            'Sec-WebSocket-Version: 13',
            '',
            '',
          ].join('\r\n'),
        );
      });

      const onHandshakeData = (chunk) => {
        handshake = Buffer.concat([handshake, chunk]);
        const headerEnd = handshake.indexOf('\r\n\r\n');

        if (headerEnd === -1) {
          return;
        }

        const header = handshake.slice(0, headerEnd).toString('utf8');

        if (!header.includes(' 101 ')) {
          reject(new Error(`WebSocket handshake falhou: ${header.split('\r\n')[0]}`));
          return;
        }

        socket.off('data', onHandshakeData);
        socket.on('data', (data) => this.onData(data));
        socket.on('close', () => this.closeHandlers.forEach((handler) => handler()));

        const leftover = handshake.slice(headerEnd + 4);
        if (leftover.length > 0) {
          this.onData(leftover);
        }

        resolve();
      };

      socket.on('data', onHandshakeData);
    });
  }

  onMessage(handler) {
    this.messageHandlers.push(handler);
  }

  onClose(handler) {
    this.closeHandlers.push(handler);
  }

  onData(data) {
    this.buffer = Buffer.concat([this.buffer, data]);

    while (this.buffer.length >= 2) {
      const first = this.buffer[0];
      const second = this.buffer[1];
      const opcode = first & 0x0f;
      let offset = 2;
      let length = second & 0x7f;

      if (length === 126) {
        if (this.buffer.length < offset + 2) return;
        length = this.buffer.readUInt16BE(offset);
        offset += 2;
      } else if (length === 127) {
        if (this.buffer.length < offset + 8) return;
        length = Number(this.buffer.readBigUInt64BE(offset));
        offset += 8;
      }

      const masked = Boolean(second & 0x80);
      const maskLength = masked ? 4 : 0;
      const frameEnd = offset + maskLength + length;

      if (this.buffer.length < frameEnd) {
        return;
      }

      let payload = this.buffer.slice(offset + maskLength, frameEnd);

      if (masked) {
        const mask = this.buffer.slice(offset, offset + 4);
        payload = Buffer.from(payload.map((byte, index) => byte ^ mask[index % 4]));
      }

      this.buffer = this.buffer.slice(frameEnd);

      if (opcode === 1) {
        const text = payload.toString('utf8');
        this.messageHandlers.forEach((handler) => handler(text));
      } else if (opcode === 8) {
        this.close();
        this.closeHandlers.forEach((handler) => handler());
      } else if (opcode === 9) {
        this.sendFrame(0x8a, payload);
      }
    }
  }

  send(text) {
    this.sendFrame(0x81, Buffer.from(text, 'utf8'));
  }

  sendFrame(firstByte, payload) {
    const mask = randomBytes(4);
    const maskedPayload = Buffer.alloc(payload.length);

    for (let index = 0; index < payload.length; index += 1) {
      maskedPayload[index] = payload[index] ^ mask[index % 4];
    }

    let header;

    if (payload.length < 126) {
      header = Buffer.from([firstByte, 0x80 | payload.length]);
    } else if (payload.length <= 65535) {
      header = Buffer.alloc(4);
      header[0] = firstByte;
      header[1] = 0x80 | 126;
      header.writeUInt16BE(payload.length, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = firstByte;
      header[1] = 0x80 | 127;
      header.writeBigUInt64BE(BigInt(payload.length), 2);
    }

    this.socket.write(Buffer.concat([header, mask, maskedPayload]));
  }

  close() {
    this.socket?.destroy();
  }
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.nextId = 1;
    this.pending = new Map();
  }

  async connect() {
    this.ws = new RawWebSocket(this.wsUrl);
    await this.ws.connect();
    this.ws.onMessage((rawMessage) => {
      const message = JSON.parse(rawMessage);
      if (!message.id || !this.pending.has(message.id)) {
        return;
      }

      const { resolve: resolvePending, reject: rejectPending } = this.pending.get(message.id);
      this.pending.delete(message.id);

      if (message.error) {
        rejectPending(new Error(`${message.error.message}: ${message.error.data ?? ''}`));
        return;
      }

      resolvePending(message.result);
    });
    this.ws.onClose(() => {
      for (const { reject } of this.pending.values()) {
        reject(new Error('Conexao CDP fechada.'));
      }
      this.pending.clear();
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`Timeout in CDP method ${method}`));
        }
      }, 20000);
    });
  }

  close() {
    this.ws?.close();
  }
}

async function launchBrowser() {
  const port = await getFreePort();
  const profileDir = path.join(process.cwd(), `.tmp-terra-edge-${Date.now()}`);
  await mkdir(profileDir, { recursive: true });

  const proc = spawn(
    EDGE_PATH,
    [
      '--headless=new',
      '--disable-gpu',
      '--disable-extensions',
      '--remote-allow-origins=*',
      '--no-first-run',
      '--no-default-browser-check',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profileDir}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  let version;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      version = await requestJson(`http://127.0.0.1:${port}/json/version`);
      break;
    } catch {
      await wait(250);
    }
  }

  if (!version) {
    throw new Error('Nao foi possivel iniciar o navegador Edge via CDP.');
  }

  let pageTab;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const tabs = await requestJson(`http://127.0.0.1:${port}/json/list`);
    pageTab = tabs.find((item) => item.type === 'page');

    if (pageTab) {
      break;
    }

    await wait(150);
  }

  if (!pageTab) {
    pageTab = await requestJson(`http://127.0.0.1:${port}/json/new?about:blank`, {
      method: 'PUT',
    });
  }

  const client = new CdpClient(pageTab.webSocketDebuggerUrl);
  await client.connect();
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Network.enable');
  await client.send('Emulation.clearDeviceMetricsOverride').catch(() => undefined);

  return { client, proc, profileDir };
}

async function cleanupBrowser(proc, profileDir, client) {
  client?.close();
  proc?.kill();
  await new Promise((resolve) => {
    proc?.once('exit', resolve);
    setTimeout(resolve, 2500);
  });
  await rm(profileDir, { recursive: true, force: true }).catch(() => undefined);
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });

  if (result.exceptionDetails) {
    const details = result.exceptionDetails.exception?.description ?? result.exceptionDetails.text;
    throw new Error(details);
  }

  return result.result.value;
}

async function runInPage(client, fn, arg) {
  const source = `(${fn.toString()})(${JSON.stringify(arg)})`;
  return evaluate(client, source);
}

async function navigate(client, route) {
  await client.send('Page.navigate', { url: `${BASE_URL}${route}` });
  await waitFor(client, () => document.readyState === 'complete' || document.readyState === 'interactive', 'pagina carregada');
  await injectQa(client);
}

async function reload(client) {
  await client.send('Page.reload');
  await waitFor(client, () => document.readyState === 'complete' || document.readyState === 'interactive', 'pagina recarregada');
  await injectQa(client);
}

async function waitFor(client, predicate, label, timeoutMs = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const ok = await runInPage(client, predicate);
      if (ok) {
        return;
      }
    } catch {
      // The execution context can disappear while navigating.
    }
    await wait(150);
  }
  throw new Error(`Timeout aguardando ${label}`);
}

async function waitText(client, text, timeoutMs = 10000) {
  await waitFor(client, (expected) => window.__qa?.hasText(expected), `texto ${text}`, timeoutMs);
}

async function injectQa(client) {
  await evaluate(
    client,
    `(() => {
      const norm = (value) => String(value ?? '')
        .normalize('NFD')
        .replace(/[\\u0300-\\u036f]/g, '')
        .toLowerCase()
        .replace(/\\s+/g, ' ')
        .trim();
      const visible = (el) => {
        if (!el) return false;
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      };
      const setValue = (el, value) => {
        const proto =
          el instanceof HTMLSelectElement
            ? HTMLSelectElement.prototype
            : el instanceof HTMLTextAreaElement
              ? HTMLTextAreaElement.prototype
              : HTMLInputElement.prototype;
        const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
        descriptor.set.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const labelControl = (labelText, index = 0) => {
        const labels = [...document.querySelectorAll('label')]
          .filter(visible)
          .filter((label) => norm(label.innerText).includes(norm(labelText)));
        const label = labels[index];
        if (!label) throw new Error('Label nao encontrado: ' + labelText);
        const control = label.querySelector('input, select, textarea');
        if (!control) throw new Error('Controle nao encontrado: ' + labelText);
        return control;
      };
      const findClickable = (text, index = 0) => {
        const items = [...document.querySelectorAll('button, a')]
          .filter(visible)
          .filter((el) => norm(el.innerText).includes(norm(text)) || norm(el.getAttribute('aria-label')).includes(norm(text)));
        const item = items[index];
        if (!item) throw new Error('Acao nao encontrada: ' + text);
        return item;
      };
      window.__qa = {
        norm,
        text: () => document.body.innerText,
        hasText: (text) => norm(document.body.innerText).includes(norm(text)),
        metric(label) {
          const nodes = [...document.querySelectorAll('p, dt, span')].filter((node) => norm(node.innerText) === norm(label));
          const node = nodes[0];
          if (!node) return null;
          const parent = node.parentElement;
          const candidates = [...parent.querySelectorAll('p, dd')].map((item) => item.innerText.trim()).filter(Boolean);
          return candidates[candidates.length - 1] ?? null;
        },
        click(text, index = 0) {
          findClickable(text, index).click();
        },
        clickAria(text) {
          const item = [...document.querySelectorAll('button, a')]
            .filter(visible)
            .find((el) => norm(el.getAttribute('aria-label')).includes(norm(text)));
          if (!item) throw new Error('Aria nao encontrada: ' + text);
          item.click();
        },
        fill(label, value, index = 0) {
          setValue(labelControl(label, index), value);
        },
        selectValue(label, value, index = 0) {
          const el = labelControl(label, index);
          setValue(el, value);
        },
        selectText(label, optionText, index = 0) {
          const el = labelControl(label, index);
          const option = [...el.options].find((item) => norm(item.textContent).includes(norm(optionText)));
          if (!option) throw new Error('Opcao nao encontrada: ' + label + ' -> ' + optionText);
          setValue(el, option.value);
        },
        optionTexts(label, index = 0) {
          const el = labelControl(label, index);
          return [...el.options].map((item) => item.textContent.trim());
        },
        isOptionDisabled(label, optionText, index = 0) {
          const el = labelControl(label, index);
          const option = [...el.options].find((item) => norm(item.textContent).includes(norm(optionText)));
          return option ? option.disabled : null;
        },
        checkByText(text) {
          const label = [...document.querySelectorAll('label')].filter(visible).find((item) => norm(item.innerText).includes(norm(text)));
          if (!label) throw new Error('Checkbox/radio nao encontrado: ' + text);
          const input = label.querySelector('input');
          if (!input) throw new Error('Input nao encontrado: ' + text);
          if (!input.checked) input.click();
        },
        save() {
          const form = document.querySelector('form');
          const button = [...(form ?? document).querySelectorAll('button')]
            .filter(visible)
            .find((item) => norm(item.innerText).includes('salvar'));
          if (!button) throw new Error('Botao salvar nao encontrado');
          button.click();
        },
        visible(selector) {
          return visible(document.querySelector(selector));
        }
      };
      return true;
    })()`,
  );
}

async function click(client, text, index = 0) {
  await runInPage(client, ({ text, index }) => window.__qa.click(text, index), { text, index });
  await wait(250);
}

async function clickAria(client, text) {
  await runInPage(client, (value) => window.__qa.clickAria(value), text);
  await wait(250);
}

async function fill(client, label, value, index = 0) {
  await runInPage(client, ({ label, value, index }) => window.__qa.fill(label, value, index), {
    label,
    value,
    index,
  });
}

async function selectValue(client, label, value, index = 0) {
  await runInPage(client, ({ label, value, index }) => window.__qa.selectValue(label, value, index), {
    label,
    value,
    index,
  });
}

async function selectText(client, label, value, index = 0) {
  await runInPage(client, ({ label, value, index }) => window.__qa.selectText(label, value, index), {
    label,
    value,
    index,
  });
}

async function saveForm(client) {
  await runInPage(client, () => window.__qa.save());
  await wait(400);
}

async function getDbSnapshot(client) {
  return runInPage(
    client,
    async (dbName) => {
      function openDb() {
        return new Promise((resolve, reject) => {
          const request = indexedDB.open(dbName);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve(request.result);
        });
      }
      function all(db, store) {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(store, 'readonly');
          const req = tx.objectStore(store).getAll();
          req.onerror = () => reject(req.error);
          req.onsuccess = () => resolve(req.result);
        });
      }
      const db = await openDb();
      const stores = [
        'animals',
        'inseminations',
        'pregnancyDiagnoses',
        'births',
        'semen',
        'sanitaryManagement',
        'lots',
      ];
      const data = {};
      for (const store of stores) {
        data[store] = await all(db, store);
      }
      db.close();
      return data;
    },
    DB_NAME,
  );
}

async function createLot(client, name) {
  await navigate(client, '/lotes-piquetes');
  await click(client, 'Novo lote');
  await fill(client, 'Nome do lote', name);
  await fill(client, 'Tipo de pastagem', 'Brachiaria');
  await fill(client, 'Area aproximada', '12.5');
  await saveForm(client);
  await waitText(client, 'cadastrado com sucesso');
}

async function createSemen(client, bullName, doses) {
  await navigate(client, '/touros-semen');
  await click(client, 'Novo registro');
  await fill(client, 'Nome ou codigo do touro', bullName);
  await fill(client, 'Raca', 'Nelore');
  await fill(client, 'Central de semen', 'Central ABC');
  await fill(client, 'Doses disponiveis', String(doses));
  await fill(client, 'Valor por dose', '35');
  await fill(client, 'Caracteristicas geneticas', 'DEP positiva');
  await saveForm(client);
  await waitText(client, 'cadastrado com sucesso');
}

async function createAnimal(client, data) {
  await navigate(client, '/animais');
  await click(client, 'Novo animal');
  await fill(client, 'Identificacao', data.identification);
  if (data.name) await fill(client, 'Nome', data.name);
  if (data.breed) await fill(client, 'Raca', data.breed);
  await selectValue(client, 'Categoria', data.category);
  await selectValue(client, 'Sexo', data.sex);
  await fill(client, 'Data de nascimento', data.birthDate ?? '2024-01-01');
  await fill(client, 'Peso', data.weight ?? '380');
  if (data.lot) await selectText(client, 'Lote/piquete', data.lot);
  await selectValue(client, 'Status', 'active');
  if (data.mother) await selectText(client, 'Mae', data.mother);
  if (data.father) await selectText(client, 'Pai', data.father);
  await saveForm(client);
  await waitText(client, 'cadastrado com sucesso');
}

async function runTests(client) {
  await navigate(client, '/dashboard');
  assert((await evaluate(client, 'document.title')) === 'TERRA', 'PWA/titulo', 'titulo do navegador esta como TERRA');

  const manifest = await evaluate(
    client,
    `fetch('/manifest.webmanifest').then((response) => response.json()).then((manifest) => ({ name: manifest.name, shortName: manifest.short_name }))`,
  );
  assert(manifest.name === 'TERRA' && manifest.shortName === 'TERRA', 'PWA/manifest', 'manifest nomeia o app como TERRA');

  const serviceWorkerReady = await evaluate(
    client,
    `Promise.race([
      navigator.serviceWorker?.ready.then(() => true).catch(() => false),
      new Promise((resolve) => setTimeout(() => resolve(false), 5000))
    ])`,
  );
  assert(serviceWorkerReady, 'PWA/service worker', 'service worker registrado na build de producao');

  await reload(client);
  const controlled = await evaluate(client, 'Boolean(navigator.serviceWorker?.controller)');
  assert(controlled, 'PWA/controle offline', 'pagina ficou controlada pelo service worker');

  await client.send('Network.emulateNetworkConditions', {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0,
  });
  await navigate(client, '/dashboard');
  assert(await runInPage(client, () => window.__qa.hasText('Dashboard')), 'PWA/reload offline', 'dashboard abriu com rede emulada offline');
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });

  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await navigate(client, '/animais');
  const mobileLayout = await runInPage(client, () => ({
    mobileNav: window.__qa.visible('nav[aria-label*="mobile" i]'),
    sidebar: window.__qa.visible('aside'),
  }));
  assert(mobileLayout.mobileNav && !mobileLayout.sidebar, 'Responsivo/mobile', 'menu inferior visivel e sidebar oculta');

  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1366,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await navigate(client, '/dashboard');
  const desktopLayout = await runInPage(client, () => ({
    mobileNav: window.__qa.visible('nav[aria-label*="mobile" i]'),
    sidebar: window.__qa.visible('aside'),
  }));
  assert(desktopLayout.sidebar && !desktopLayout.mobileNav, 'Responsivo/desktop', 'sidebar visivel e menu mobile oculto');

  await createLot(client, 'Piquete 01');
  await createSemen(client, 'Touro Nelore 01', 3);
  await createSemen(client, 'Touro Zero', 0);
  await createAnimal(client, {
    identification: 'M001',
    name: 'Matriz 001',
    category: 'matrix',
    sex: 'female',
    breed: 'Nelore',
    lot: 'Piquete 01',
    birthDate: '2022-01-10',
    weight: '430',
  });
  await createAnimal(client, {
    identification: 'M002',
    name: 'Matriz 002',
    category: 'matrix',
    sex: 'female',
    breed: 'Nelore',
    lot: 'Piquete 01',
    birthDate: '2022-02-10',
    weight: '410',
  });
  await createAnimal(client, {
    identification: 'T001',
    name: 'Touro 001',
    category: 'bull',
    sex: 'male',
    breed: 'Nelore',
    lot: 'Piquete 01',
    birthDate: '2020-03-10',
    weight: '720',
  });

  await navigate(client, '/animais');
  await click(client, 'Novo animal');
  await fill(client, 'Identificacao', 'M001');
  await selectValue(client, 'Categoria', 'matrix');
  await selectValue(client, 'Sexo', 'female');
  await saveForm(client);
  await waitText(client, 'Ja existe um animal');
  pass('Animais/duplicidade', 'brinco duplicado bloqueado na interface');
  await click(client, 'Cancelar');

  await navigate(client, '/animais');
  await click(client, 'Novo animal');
  await fill(client, 'Identificacao', 'BTEST');
  await fill(client, 'Nome', 'Bezerro teste');
  await selectValue(client, 'Categoria', 'calf');
  await selectValue(client, 'Sexo', 'female');
  const parentOptions = await runInPage(client, () => ({
    mothers: window.__qa.optionTexts('Mae'),
    fathers: window.__qa.optionTexts('Pai'),
  }));
  assert(
    parentOptions.mothers.some((item) => item.includes('M001')) && !parentOptions.mothers.some((item) => item.includes('T001')),
    'Mae/opcoes',
    'campo Mae lista femeas e nao lista touros',
  );
  assert(
    parentOptions.fathers.some((item) => item.includes('T001')) && !parentOptions.fathers.some((item) => item.includes('M001')),
    'Pai/opcoes',
    'campo Pai lista machos e nao lista matrizes',
  );
  await selectText(client, 'Mae', 'M001');
  await selectText(client, 'Pai', 'T001');
  await selectText(client, 'Lote/piquete', 'Piquete 01');
  await saveForm(client);
  await waitText(client, 'cadastrado com sucesso');

  await clickAria(client, 'Editar animal M001');
  await selectValue(client, 'Sexo', 'male');
  await saveForm(client);
  await waitText(client, 'vinculado como mae');
  pass('Mae/regra de sexo', 'nao permite transformar mae vinculada em macho');
  await click(client, 'Cancelar');

  await clickAria(client, 'Editar animal T001');
  await selectValue(client, 'Sexo', 'female');
  await saveForm(client);
  await waitText(client, 'vinculado como pai');
  pass('Pai/regra de sexo', 'nao permite transformar pai vinculado em femea');
  await click(client, 'Cancelar');

  await createAnimal(client, {
    identification: 'DEL-1',
    name: 'Animal exclusao',
    category: 'calf',
    sex: 'male',
    breed: 'Nelore',
    lot: 'Piquete 01',
    birthDate: '2024-04-10',
    weight: '150',
  });
  await navigate(client, '/animais');
  await clickAria(client, 'Excluir animal DEL-1');
  await waitText(client, 'Confirmar exclusao');
  await click(client, 'Cancelar');
  assert(await runInPage(client, () => window.__qa.hasText('DEL-1')), 'Animais/exclusao cancelada', 'cancelar preserva o animal');
  await clickAria(client, 'Excluir animal DEL-1');
  await click(client, 'Excluir animal');
  await waitText(client, 'excluido com sucesso');
  pass('Animais/exclusao confirmada', 'confirmacao remove via soft delete');

  await navigate(client, '/animais');
  await fill(client, 'Buscar', 'Nelore');
  await selectValue(client, 'Categoria', 'matrix');
  await selectValue(client, 'Sexo', 'female');
  await selectText(client, 'Lote/piquete', 'Piquete 01');
  await selectValue(client, 'Status', 'active', 1);
  await wait(500);
  const filtered = await runInPage(client, () => window.__qa.metric('Resultado filtrado'));
  assert(filtered === '2', 'Animais/filtros', 'busca + categoria + sexo + lote + status retornou 2 matrizes');

  await navigate(client, '/inseminacoes');
  await click(client, 'Nova inseminacao');
  await selectText(client, 'Matriz', 'M001');
  await fill(client, 'Data da inseminacao', '2025-09-20');
  assert(
    (await runInPage(client, () => window.__qa.isOptionDisabled('Touro/semen utilizado', 'Touro Zero'))) === true,
    'Inseminacao/semen zerado',
    'semen sem estoque aparece desabilitado',
  );
  await selectText(client, 'Touro/semen utilizado', 'Touro Nelore 01');
  await fill(client, 'Inseminador responsavel', 'Joao');
  await fill(client, 'Protocolo utilizado', 'IATF teste');
  await saveForm(client);
  await waitText(client, 'registrada com sucesso');

  await click(client, 'Nova inseminacao');
  await selectText(client, 'Matriz', 'M002');
  await fill(client, 'Data da inseminacao', '2026-05-01');
  await selectText(client, 'Touro/semen utilizado', 'Touro Nelore 01');
  await fill(client, 'Inseminador responsavel', 'Joao');
  await saveForm(client);
  await waitText(client, 'registrada com sucesso');

  let snapshot = await getDbSnapshot(client);
  const semen = snapshot.semen.find((item) => item.bull_name === 'Touro Nelore 01');
  const m001 = snapshot.animals.find((item) => item.identification === 'M001');
  const m002 = snapshot.animals.find((item) => item.identification === 'M002');
  assert(semen?.doses_available === 1, 'Inseminacao/estoque', 'duas IAs reduziram estoque de 3 para 1');
  assert(m001?.reproductive_status === 'inseminated' && m002?.reproductive_status === 'inseminated', 'Inseminacao/status matriz', 'matrizes foram marcadas como inseminadas');

  await navigate(client, '/dashboard');
  await waitText(client, 'Diagnostico de gestacao proximo');
  pass('Dashboard/alerta diagnostico', 'IA de M002 gerou alerta de diagnostico proximo');

  await navigate(client, '/diagnostico-gestacao');
  await click(client, 'Novo diagnostico');
  await selectText(client, 'Matriz avaliada', 'M001');
  await fill(client, 'Data do diagnostico', '2026-05-15');
  await selectValue(client, 'Resultado', 'pregnant');
  await saveForm(client);
  await waitText(client, 'registrado com sucesso');

  snapshot = await getDbSnapshot(client);
  const m001AfterDiagnosis = snapshot.animals.find((item) => item.identification === 'M001');
  const m001Insemination = snapshot.inseminations.find((item) => item.animal_id === m001AfterDiagnosis.id);
  assert(m001AfterDiagnosis?.reproductive_status === 'pregnant', 'Diagnostico/status matriz', 'diagnostico positivo marcou matriz prenha');
  assert(m001Insemination?.status === 'positive', 'Diagnostico/status IA', 'inseminacao relacionada virou positiva');

  await navigate(client, '/dashboard');
  await waitText(client, 'Parto previsto');
  assert(await runInPage(client, () => window.__qa.metric('Vacas prenhas')) === '1', 'Dashboard/prenhas', 'card Vacas prenhas atualizou para 1');

  await navigate(client, '/partos');
  await click(client, 'Novo parto');
  await selectText(client, 'Matriz', 'M001');
  await fill(client, 'Data do parto', '2025-01-01');
  await fill(client, 'Identificacao do bezerro', 'BZ-ERR');
  await saveForm(client);
  await waitText(client, 'parto nao pode ser anterior');
  pass('Partos/data invalida', 'parto anterior a inseminacao foi bloqueado');
  await fill(client, 'Data do parto', '2026-05-20');
  await selectValue(client, 'Sexo do bezerro', 'male');
  await fill(client, 'Peso ao nascer', '32');
  await fill(client, 'Identificacao do bezerro', 'BZ-001');
  await saveForm(client);
  await waitText(client, 'bezerro cadastrado com sucesso');

  snapshot = await getDbSnapshot(client);
  const calf = snapshot.animals.find((item) => item.identification === 'BZ-001');
  const m001AfterBirth = snapshot.animals.find((item) => item.identification === 'M001');
  assert(Boolean(calf && calf.category === 'calf' && calf.mother_id === m001AfterBirth.id), 'Partos/bezerro automatico', 'bezerro vivo foi cadastrado em Animais com mae vinculada');
  assert(m001AfterBirth?.reproductive_status === 'calved', 'Partos/status matriz', 'matriz ficou como parida');

  await navigate(client, '/manejo-sanitario');
  await click(client, 'Novo manejo');
  await selectText(client, 'Animal tratado', 'M001');
  await selectValue(client, 'Status', 'pending');
  await fill(client, 'Data de aplicacao', '2026-05-25');
  await fill(client, 'Proxima aplicacao', '2026-05-29');
  await fill(client, 'Responsavel', 'Maria');
  await fill(client, 'Produto utilizado', 'Vacina clostridial');
  await fill(client, 'Dosagem', '5 ml');
  await saveForm(client);
  await waitText(client, 'cadastrado com sucesso');

  await click(client, 'Novo manejo');
  await runInPage(client, () => window.__qa.checkByText('Lote tratado'));
  await selectValue(client, 'Tipo', 'deworming');
  await selectValue(client, 'Status', 'pending');
  await selectText(client, 'Lote tratado', 'Piquete 01');
  await fill(client, 'Data de aplicacao', '2026-05-25');
  await fill(client, 'Proxima aplicacao', '2026-06-10');
  await fill(client, 'Produto utilizado', 'Vermifugo X');
  await fill(client, 'Dosagem', '10 ml');
  await saveForm(client);
  await waitText(client, 'cadastrado com sucesso');
  await waitText(client, 'Manejos vencidos');
  await waitText(client, 'Proximas aplicacoes');
  pass('Manejo/alertas locais', 'manejo vencido e proximo aparecem na tela');

  await selectValue(client, 'Tipo', 'deworming', 1);
  await selectValue(client, 'Status', 'pending', 1);
  await wait(500);
  assert(await runInPage(client, () => window.__qa.hasText('Vermifugo X')), 'Manejo/filtros', 'filtros por tipo e status encontram o manejo de lote');

  await reload(client);
  snapshot = await getDbSnapshot(client);
  assert(snapshot.animals.filter((item) => !item.deleted_at).length === 5, 'Persistencia/animais', 'dados persistiram no IndexedDB apos reload');
  assert(snapshot.sanitaryManagement.length === 2, 'Persistencia/manejo', 'manejos persistiram no IndexedDB apos reload');

  await navigate(client, '/dashboard');
  await waitText(client, 'Total de animais');
  const metrics = await runInPage(client, () => ({
    totalAnimals: window.__qa.metric('Total de animais'),
    totalMatrices: window.__qa.metric('Total de matrizes'),
    totalBulls: window.__qa.metric('Total de touros'),
    totalCalves: window.__qa.metric('Total de bezerros'),
    inseminated: window.__qa.metric('Vacas inseminadas'),
    monthInseminations: window.__qa.metric('IA no mes'),
    pendingSanitary: window.__qa.metric('Manejos pendentes'),
    lowSemen: window.__qa.metric('Estoque baixo de semen'),
    expectedBirths: window.__qa.metric('Partos previstos'),
    hasLowSemenAlert: window.__qa.hasText('Estoque baixo de semen'),
    hasOverdueVaccine: window.__qa.hasText('Vacina vencida'),
    hasUpcomingDeworming: window.__qa.hasText('Vermifugo vencendo'),
  }));
  assert(metrics.totalAnimals === '5', 'Dashboard/total animais', '5 animais ativos apos excluir DEL-1 e gerar BZ-001');
  assert(metrics.totalMatrices === '2', 'Dashboard/matrizes', '2 matrizes');
  assert(metrics.totalBulls === '1', 'Dashboard/touros', '1 touro');
  assert(metrics.totalCalves === '2', 'Dashboard/bezerros', 'BTEST + BZ-001');
  assert(metrics.inseminated === '1', 'Dashboard/inseminadas', 'M002 segue aguardando diagnostico');
  assert(metrics.monthInseminations === '1', 'Dashboard/IA mes', 'IA de maio contabilizada');
  assert(metrics.pendingSanitary === '2', 'Dashboard/manejos pendentes', 'vencido + pendente');
  assert(metrics.lowSemen === '2', 'Dashboard/estoque baixo', 'semen com 1 dose e semen zerado');
  assert(metrics.hasLowSemenAlert && metrics.hasOverdueVaccine && metrics.hasUpcomingDeworming, 'Dashboard/alertas finais', 'alertas sanitarios e estoque aparecem');

  if (metrics.expectedBirths !== '0') {
    findings.push('Dashboard mostra Partos previstos mesmo depois de registrar o parto da matriz M001. Parece faltar excluir matrizes ja paridas desse indicador.');
    warn('Dashboard/possivel regra', `Partos previstos ficou ${metrics.expectedBirths} apos parto registrado`);
  }

  const screenshotDir = path.join(process.cwd(), 'test-results');
  await mkdir(screenshotDir, { recursive: true });
  const dashboardShot = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  await writeFile(path.join(screenshotDir, 'terra-dashboard-test.png'), Buffer.from(dashboardShot.data, 'base64'));
}

async function main() {
  let browser;
  try {
    browser = await launchBrowser();
    await runTests(browser.client);
  } catch (error) {
    fail('Execucao', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    if (browser) {
      await cleanupBrowser(browser.proc, browser.profileDir, browser.client);
    }
  }

  console.log('\nSUMMARY');
  console.log(JSON.stringify({ results, findings }, null, 2));
}

await main();
