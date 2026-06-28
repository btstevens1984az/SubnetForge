const PRESETS = ['10.0.0.0/8','172.16.0.0/12','192.168.0.0/16','10.0.1.0/24','10.0.0.0/26','203.0.113.0/24']

function ipToInt(ip) {
  return ip.split('.').reduce((a, o) => (a << 8) + Number(o), 0) >>> 0
}

function intToIp(n) {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.')
}

function parseCidr(cidr) {
  const [ip, pfx] = cidr.trim().split('/')
  const prefix = Number(pfx)
  if (!ip || Number.isNaN(prefix) || prefix < 0 || prefix > 32) throw new Error('Invalid CIDR')
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((n) => n < 0 || n > 255 || Number.isNaN(n))) throw new Error('Invalid IP')
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0
  const base = ipToInt(ip)
  const network = (base & mask) >>> 0
  const broadcast = (network | (~mask >>> 0)) >>> 0
  const total = prefix === 32 ? 1 : 2 ** (32 - prefix)
  const usable = prefix >= 31 ? total : Math.max(0, total - 2)
  const wildcard = (~mask) >>> 0
  return { ip, prefix, mask, network, broadcast, total, usable, wildcard }
}

function toBinary(n) {
  return (n >>> 0).toString(2).padStart(32, '0').match(/.{8}/g).join('.')
}

function calc() {
  const err = document.getElementById('error')
  try {
    const cidr = document.getElementById('cidr-input').value
    const r = parseCidr(cidr)
    err.hidden = true
    document.getElementById('results').innerHTML = `
      <tr><td>Network</td><td class="mono">${intToIp(r.network)}/${r.prefix}</td></tr>
      <tr><td>Netmask</td><td class="mono">${intToIp(r.mask)}</td></tr>
      <tr><td>Wildcard</td><td class="mono">${intToIp(r.wildcard)}</td></tr>
      <tr><td>Network addr</td><td class="mono">${intToIp(r.network)}</td></tr>
      <tr><td>Broadcast</td><td class="mono">${intToIp(r.broadcast)}</td></tr>
      <tr><td>First host</td><td class="mono">${r.prefix >= 31 ? intToIp(r.network) : intToIp(r.network + 1)}</td></tr>
      <tr><td>Last host</td><td class="mono">${r.prefix >= 31 ? intToIp(r.broadcast) : intToIp(r.broadcast - 1)}</td></tr>
      <tr><td>Total addresses</td><td>${r.total.toLocaleString()}</td></tr>
      <tr><td>Usable hosts</td><td>${r.usable.toLocaleString()}</td></tr>
      <tr><td>IP class</td><td>${r.network >>> 24 < 128 ? 'A' : r.network >>> 24 < 192 ? 'B' : 'C'}</td></tr>
    `
    document.getElementById('binary').textContent =
      `IP:       ${toBinary(ipToInt(r.ip))}\nMask:     ${toBinary(r.mask)}\nNetwork:  ${toBinary(r.network)}`
    const hosts = []
    const start = r.prefix >= 31 ? r.network : r.network + 1
    const end = Math.min(r.prefix >= 31 ? r.broadcast : r.broadcast - 1, start + 15)
    for (let i = start; i <= end; i++) hosts.push(intToIp(i))
    document.getElementById('hosts').textContent = hosts.join('\n') + (r.usable > 16 ? '\n…' : '')
    updateSplitOptions(r.prefix)
  } catch (e) {
    err.textContent = e.message
    err.hidden = false
  }
}

function updateSplitOptions(prefix) {
  const sel = document.getElementById('split-prefix')
  sel.innerHTML = ''
  for (let p = prefix + 1; p <= 30; p++) {
    const opt = document.createElement('option')
    opt.value = p
    opt.textContent = `/${p} (${2 ** (p - prefix)} subnets)`
    sel.appendChild(opt)
  }
}

function splitSubnet() {
  try {
    const r = parseCidr(document.getElementById('cidr-input').value)
    const newPfx = Number(document.getElementById('split-prefix').value)
    const count = 2 ** (newPfx - r.prefix)
    const size = 2 ** (32 - newPfx)
    const lines = []
    for (let i = 0; i < Math.min(count, 16); i++) {
      const net = (r.network + i * size) >>> 0
      lines.push(`${intToIp(net)}/${newPfx}`)
    }
    if (count > 16) lines.push(`… and ${count - 16} more`)
    document.getElementById('split-results').textContent = lines.join('\n')
  } catch (e) {
    document.getElementById('split-results').textContent = e.message
  }
}

document.getElementById('presets').innerHTML = PRESETS.map((p) =>
  `<button type="button" data-p="${p}">${p}</button>`).join('')
document.getElementById('presets').addEventListener('click', (e) => {
  if (e.target.dataset.p) {
    document.getElementById('cidr-input').value = e.target.dataset.p
    calc()
  }
})
document.getElementById('btn-calc').addEventListener('click', calc)
document.getElementById('btn-split').addEventListener('click', () => {
  const v = document.getElementById('cidr-input').value
  const pfx = Number(v.split('/')[1] || 24)
  if (pfx < 31) document.getElementById('cidr-input').value = v.replace(/\/\d+/, `/${pfx + 1}`)
  calc()
})
document.getElementById('btn-split-go').addEventListener('click', splitSubnet)
document.getElementById('cidr-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') calc() })
calc()
