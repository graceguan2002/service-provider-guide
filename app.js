// ========== 全局状态 ==========
// 免登录模式：所有访客直接进入，进度只保存在内存中，不写入任何存储
let currentUser = '游客';
let progress = {}; // { stepId: { status: 'done' | 'skipped' } }
let currentPhase = 1;

// 用户分流变量
let userType = null; // 'frame' | 'nonframe' | null

// ========== 工具函数 ==========
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function showView(view) {
    $$('.view').forEach(v => v.classList.add('hidden'));
    $(view).classList.remove('hidden');
}

// ========== 主应用（免登录直接进入） ==========
function enterApp() {
    currentUser = '游客';
    progress = {};
    userType = null;
    currentPhase = 1;
    showView('#app-view');

    applyUserTypeToUI();

    renderInviteArea();
    renderPolicyArea();
    renderLanes();
    renderSummary();
}

function bindGlobal() {
    $('#btn-reset').addEventListener('click', () => {
        if (!confirm('确认重置当前进度吗？此操作不可恢复。')) return;
        progress = {};
        userType = null;
        currentPhase = 1;
        renderInviteArea();
        renderPolicyArea();
        renderLanes();
        renderSummary();
    });
}

// ========== 批次解锁逻辑 ==========
// 第一批：准入前 3 项（开通服务商端口 / 完成对公验证 / 缴纳准入保证金）
const BATCH1_IDS = ['s1_1', 's1_2', 's1_3'];

// 签框代理办结前 3 项后，自动定位并高亮上方待回答的判断问题（仅状态变化时滚动一次）
let lastPromptKey = null;
function maybePromptPolicy() {
    const el = $('#policy-area');
    if (!el) return;
    // 待回答：① 最近三个月是否达到 100 万；② 若已达到 100 万，还需回答当季是否达到 10 万
    const needAnswer = (userType === 'frame' && isBatch1Complete() &&
        (!progress['s2_decision_recent'] || (!isRecentNo() && !progress['s2_decision_spend'])));
    const key = `${userType}|${isBatch1Complete()}|${!!progress['s2_decision_recent']}|${(progress['s2_decision_recent'] || {}).choice || ''}|${!!progress['s2_decision_spend']}`;

    if (needAnswer) {
        el.classList.add('attention');
        if (lastPromptKey !== key) {
            lastPromptKey = key;
            setTimeout(() => {
                if (typeof el.scrollIntoView === 'function') {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 150);
        }
    } else {
        el.classList.remove('attention');
        lastPromptKey = key;
    }
}

// ========== 政策激励确认提示 ==========
// 「申请政策激励」不是待办事项，仅作为一条确认提示展示在待办列表最上方
function renderPolicyNotice() {
    const area = $('#policy-notice-area');
    if (!area) return;

    // 仅签框代理、最近三个月达到 100 万、且当季选择「达到 10 万门槛，有政策」时展示
    const hasPolicy = !!(progress['s2_decision_spend'] && progress['s2_decision_spend'].choice === 's2_4') && !isRecentNo();
    const show = (userType === 'frame' && isBatch1Complete() && hasPolicy);

    if (!show) {
        area.classList.add('hidden');
        area.innerHTML = '';
        return;
    }
    area.classList.remove('hidden');

    const confirmed = !!progress['s2_4_notice'];
    area.innerHTML = `
        <div class="policy-notice${confirmed ? ' confirmed' : ''}">
            <div class="policy-notice-head">
                <span class="policy-notice-icon">📢</span>
                <div class="policy-notice-title">申请政策激励</div>
                ${confirmed ? '<span class="policy-notice-tag">已确认</span>' : ''}
            </div>
            <div class="policy-notice-body">
                <p>当季 K1 竞价全量消耗达到 10 万门槛后，即可申请政策激励，获得平台返点与流量支持。</p>
                <div class="policy-notice-cond">
                    <div class="policy-notice-cond-title">条件门槛：</div>
                    <ol>
                        <li>当季 K1 竞价全量消耗 ≥10 万</li>
                        <li>当季度完成合同归档</li>
                        <li>有效人户挂接</li>
                    </ol>
                </div>
                <p class="policy-notice-emph">请先登录「服务商系统」，进入「政策激励」，核对当季消耗数据是否符合条件，再依照以下步骤提交激励申请。</p>
            </div>
            ${confirmed ? '' : `<div class="policy-notice-actions">
                <button id="btn-policy-notice-ok" class="primary-btn policy-notice-btn">✓ 我已核对，继续后续步骤</button>
            </div>`}
        </div>`;

    const btn = $('#btn-policy-notice-ok');
    if (btn) {
        btn.addEventListener('click', () => {
            progress['s2_4_notice'] = { status: 'done' };
            saveProgress();
            renderSummary();
        });
    }
}

// 生成"下一步该做什么"的引导提示（按流程顺序提示）
// 渲染到「我的待办」板块内、待办描述下方 / 具体待办上方
function renderFlowHint() {
    const area = $('#flow-hint-area');
    if (!area) return;
    const hint = buildLockHint();
    area.innerHTML = hint;
    area.classList.toggle('hidden', !hint);
}

function buildLockHint() {
    // ① 先选择开户方式（此时不展示任何待办）
    if (!userType) {
        return `<div class="summary-lock">
            <span class="summary-lock-icon">1️⃣</span>
            <div>
                <div class="summary-lock-title">第一步：请选择开户方式</div>
                <div class="summary-lock-desc">请先在上方「<b>有邀请码吗？</b>」中选择<b>签框开户</b>或<b>非框开户</b>，选择后系统将为你生成对应的待办清单。</div>
            </div>
        </div>`;
    }
    // ② 完成前 3 项
    if (!isBatch1Complete()) {
        return `<div class="summary-lock">
            <span class="summary-lock-icon">2️⃣</span>
            <div>
                <div class="summary-lock-title">第二步：办理前 3 项准入准备</div>
                <div class="summary-lock-desc">请依次完成下方 <b>${BATCH1_IDS.filter(id => !isDone(id)).length}</b> 项待办，全部办结后将自动解锁后续步骤。</div>
            </div>
        </div>`;
    }
    // ③ 签框代理：先回答「最近三个月 K1 竞价全量消耗是否达到 100 万？」
    if (userType === 'frame' && !progress['s2_decision_recent']) {
        return `<div class="summary-lock">
            <span class="summary-lock-icon">3️⃣</span>
            <div>
                <div class="summary-lock-title">第三步：回答最近三个月消耗门槛</div>
                <div class="summary-lock-desc">前 3 项已办结。请在上方回答「<b>最近三个月 K1 竞价全量消耗是否达到 100 万？</b>」。</div>
            </div>
        </div>`;
    }
    // ④ 已达 100 万：再回答当季政策判断（未达 100 万则无需回答，直接走无政策链路）
    if (userType === 'frame' && !isRecentNo() && !progress['s2_decision_spend']) {
        return `<div class="summary-lock">
            <span class="summary-lock-icon">4️⃣</span>
            <div>
                <div class="summary-lock-title">第四步：回答政策判断</div>
                <div class="summary-lock-desc">请在上方回答「<b>当季 K1 竞价全量消耗 ≥10 万？</b>」，决定是否申请政策激励。</div>
            </div>
        </div>`;
    }
    return '';
}

// 第一批是否已完成（done 或 skipped 均视为办结）
function isBatch1Complete() {
    return BATCH1_IDS.every(id => {
        const p = progress[id];
        return !!p && (p.status === 'done' || p.status === 'skipped');
    });
}

// 第二批是否已解锁：前 3 项办结 + 已选择开户方式
function isBatch2Unlocked() {
    return isBatch1Complete() && !!userType;
}

// 当前应展示的全部步骤 id（按批次 + 开户方式过滤）
function getVisibleStepIds() {
    // 尚未选择开户方式：不展示任何待办，先由顶部引导提示引导用户做选择
    if (!userType) return [];
    // 前 3 项尚未办结：仅展示第一批
    if (!isBatch1Complete()) return BATCH1_IDS.slice();
    // 签框代理：需先回答「最近三个月 K1 竞价全量消耗是否达到 100 万？」；
    // 若达到 100 万，还需回答「当季 K1 竞价全量消耗 ≥10 万？」，两道问题均答完前不展开后续待办
    if (userType === 'frame' &&
        (!progress['s2_decision_recent'] || (!isRecentNo() && !progress['s2_decision_spend']))) {
        return BATCH1_IDS.slice();
    }

    // 第二批候选（阶段二 + 阶段三全部步骤）
    const rest = [
        's2_4', 's2_5', 's2_supplier', 's2_6',
        's3_7', 's3_10', 's3_11', 's3_12', 's3_13',
        's3_upgrade', 's3_star', 's3_honor'
    ];

    const filtered = rest.filter(id => {
        if (!FLOW.steps[id]) return false;
        // 「申请政策激励」已改为待办板块最上方的确认提示，不再作为待办事项
        if (id === 's2_4') return false;
        // 非框代理：不经过政策判断，直接进入准入后的 7 / 9 / 12
        if (userType === 'nonframe') {
            if (['s2_4', 's2_supplier', 's2_5', 's2_6'].includes(id)) return false;
            if (['s3_8', 's3_11', 's3_12', 's3_upgrade', 's3_honor'].includes(id)) return false;
        }
        // 签框代理：「无政策」分支下，政策申请与合同 / 授信相关步骤全部无需操作
        if (userType === 'frame') {
            if (isNoPolicy() && ['s2_4', 's2_5', 's2_6', 's3_8', 's3_10', 's3_11', 's3_12'].includes(id)) return false;
        }
        return true;
    });

    return BATCH1_IDS.concat(filtered);
}

// ========== 顶部准入判断：有邀请码吗 ==========
function renderInviteArea() {
    const el = $('#invite-area');
    if (!el) return;
    const chosen = userType; // 'frame' | 'nonframe' | null
    el.innerHTML = `
        <div class="invite-question">
            <span class="invite-q-icon">?</span>
            <div class="invite-q-text">
                <div class="invite-q-title">有邀请码吗？</div>
                <div class="invite-q-sub">请选择您的开户方式，以确定后续准入流程</div>
            </div>
        </div>
        <div class="invite-options">
            <button class="invite-opt ${chosen === 'frame' ? 'chosen' : ''}" data-type="frame">
                <span class="invite-opt-check">✓</span>
                <span class="invite-opt-letter">a</span>
                <span class="invite-opt-name">签框开户</span>
                <span class="invite-opt-desc">填写邀请码，补充资质，挂接人户</span>
            </button>
            <button class="invite-opt ${chosen === 'nonframe' ? 'chosen' : ''}" data-type="nonframe">
                <span class="invite-opt-check">✓</span>
                <span class="invite-opt-letter">b</span>
                <span class="invite-opt-name">非框开户</span>
                <span class="invite-opt-desc">无邀请码，自主选择非框开户</span>
            </button>
        </div>`;

    $$('.invite-opt').forEach(btn => {
        btn.addEventListener('click', () => {
            setUserType(btn.dataset.type);
        });
    });
}

// ========== 顶部判断：最近三个月 100 万 + 当季 K1 竞价全量消耗 10 万（是否需要政策） ==========
function renderPolicyArea() {
    const el = $('#policy-area');
    if (!el) return;

    // 仅签框代理需要做「是否需要政策」判断；非框代理直接跳到准入后
    // 且需等第一批（前 3 项）办结后才出现该问题
    if (userType !== 'frame' || !isBatch1Complete()) {
        el.classList.add('hidden');
        el.innerHTML = '';
        return;
    }
    el.classList.remove('hidden');

    const recentChoice = progress['s2_decision_recent'] && progress['s2_decision_recent'].choice;
    const spendChoice = progress['s2_decision_spend'] && progress['s2_decision_spend'].choice;

    // 问题一：最近三个月 K1 竞价全量消耗是否达到 100 万
    let html = `
        <div class="policy-q">
            <div class="invite-question">
                <span class="invite-q-icon">?</span>
                <div class="invite-q-text">
                    <div class="invite-q-title">最近三个月 K1 竞价全量消耗是否达到 100 万？</div>
                    <div class="invite-q-sub">「最近三个月」指从今天往前推三个月的区间，例如今天是 2026年8月8日，则统计区间为 2026年5月8日—2026年8月8日。</div>
                </div>
            </div>
            <div class="invite-options">
                <button class="invite-opt ${recentChoice === 's2_recent_yes' ? 'chosen' : ''}" data-q="recent" data-choice="s2_recent_yes">
                    <span class="invite-opt-check">✓</span>
                    <span class="invite-opt-letter yes">✓</span>
                    <span class="invite-opt-name">达到100万</span>
                </button>
                <button class="invite-opt ${recentChoice === 's2_recent_no' ? 'chosen' : ''}" data-q="recent" data-choice="s2_recent_no">
                    <span class="invite-opt-check">✓</span>
                    <span class="invite-opt-letter no">×</span>
                    <span class="invite-opt-name">未达到100万</span>
                </button>
            </div>
        </div>`;

    // 问题二：仅在「达到 100 万」时才需要回答当季门槛
    if (recentChoice === 's2_recent_yes') {
        html += `
        <div class="policy-q">
            <div class="invite-question">
                <span class="invite-q-icon">?</span>
                <div class="invite-q-text">
                    <div class="invite-q-title">当季 K1 竞价全量消耗 ≥10 万？</div>
                    <div class="invite-q-sub">识别当季 K1 竞价全量消耗是否达到 10 万门槛，以决定是否申请政策激励。「当季」指当前自然季度起始日至今天，例如今天是 2026年8月8日，则统计区间为 2026年7月1日—2026年8月8日。</div>
                </div>
            </div>
            <div class="invite-options">
                <button class="invite-opt ${spendChoice === 's2_4' ? 'chosen' : ''}" data-q="spend" data-choice="s2_4">
                    <span class="invite-opt-check">✓</span>
                    <span class="invite-opt-letter yes">✓</span>
                    <span class="invite-opt-name">达到10万门槛，有政策</span>
                </button>
                <button class="invite-opt ${spendChoice === 's2_4_no' ? 'chosen' : ''}" data-q="spend" data-choice="s2_4_no">
                    <span class="invite-opt-check">✓</span>
                    <span class="invite-opt-letter no">×</span>
                    <span class="invite-opt-name">未达门槛/自主放弃政策，无政策</span>
                </button>
            </div>
        </div>`;
    }

    el.innerHTML = html;

    $$('#policy-area .invite-opt').forEach(btn => {
        btn.addEventListener('click', () => {
            const qid = btn.dataset.q === 'recent' ? 's2_decision_recent' : 's2_decision_spend';
            setDecisionChoice(qid, btn.dataset.choice);
        });
    });
}

// ========== 用户分流（非框 / 签框）切换 ==========
function setUserType(type) {
    userType = type;
    // 重置刚做的判断为完成
    if (progress['s1_decision_invite']) delete progress['s1_decision_invite'];
    progress['s1_decision_invite'] = { status: 'done', choice: type === 'frame' ? 's1_frame' : 's1_nonframe' };

    // 重新计算 progress 中无效字段
    applyUserTypeToUI();
    renderInviteArea();
    renderPolicyArea();
    renderLanes();
    renderSummary();
    closeModal();
}
window.setUserType = setUserType;

function applyUserTypeToUI() {
    // 顶部提示条已移除（无需操作）
}

// ========== 渲染：三阶段泳道全景 ==========
function isDone(id) {
    const p = progress[id];
    if (!p) return false;
    return p.status === 'done' || p.status === 'skipped';
}

// 判断签框代理是否在「最近三个月是否达到 100 万」中选择了「未达到」
function isRecentNo() {
    const p = progress['s2_decision_recent'];
    return !!(p && p.choice === 's2_recent_no');
}

// 判断是否走「无政策」链路：最近三个月未达 100 万，或当季未达 10 万门槛 / 自主放弃
function isNoPolicy() {
    if (isRecentNo()) return true;
    const p = progress['s2_decision_spend'];
    return !!(p && p.choice === 's2_4_no');
}

// 判断某步骤是否与当前开户方式无关（无关则灰掉）
function isStepIrrelevant(id) {
    if (!userType) return false; // 尚未选择开户方式时，不灰任何步骤

    if (userType === 'nonframe') {
        // 非框代理：签框开户、整个准入期、以及授信/升级/星链/荣誉等签框专属步骤均无关
        const irrelevant = [
            's1_frame',
            's2_decision_recent', 's2_decision_spend', 's2_4', 's2_4_no', 's2_supplier', 's2_5', 's2_6',
            's3_8', 's3_11', 's3_12', 's3_upgrade', 's3_honor'
        ];
        return irrelevant.includes(id);
    }

    if (userType === 'frame') {
        // 签框代理：仅「非框开户」无关
        if (id === 's1_nonframe') return true;
        // 最近三个月未达 100 万：无需再判断当季门槛，相关政策步骤无需操作
        if (isRecentNo() && ['s2_decision_spend', 's2_4'].includes(id)) return true;
        // 签框下选择「不需要政策」时，以下步骤无需操作
        if (isNoPolicy() && ['s2_5', 's2_6', 's3_8', 's3_10', 's3_11', 's3_12'].includes(id)) {
            return true;
        }
        return false;
    }

    return false;
}

function renderLanes() {
    const area = $('#lanes-area');
    if (!area) return;

    // 图例
    renderLegend();

    const phases = FLOW.phases;
    let html = '';

    phases.forEach((ph, idx) => {
        html += `<section class="stage">
            <header class="stage-head">
                <span class="stage-no">${String(idx + 1).padStart(2, '0')}</span>
                <div>
                    <div class="stage-title">${ph.name}</div>
                    <div class="stage-sub">${ph.desc}</div>
                </div>
            </header>
            <div class="flow">${renderLaneFlow(ph.id)}</div>
        </section>`;

        if (idx < phases.length - 1) {
            html += `<div class="lane-arrow" aria-hidden="true">
                <svg fill="none" height="30" viewBox="0 0 24 24" width="30"><path d="M4 12h15M13 5l7 7-7 7" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4"/></svg>
            </div>`;
        }
    });

    area.innerHTML = html;

    // 绑定交互
    bindLanesEvents();
}

function renderLegend() {
    const el = $('#lanes-legend');
    if (!el) return;
    el.innerHTML = `
        <span><i class="sw sw-req"></i>必做步骤</span>
        <span><i class="sw sw-opt"></i>选做</span>
        <span><i class="sw sw-dec"></i>判断 / 条件</span>`;
}

// 每个阶段的泳道内部流程
function renderLaneFlow(phaseId) {
    let html = '';

    if (phaseId === 1) {
        html += renderPhase1Lane();
    } else if (phaseId === 2) {
        html += renderPhase2Lane();
    } else if (phaseId === 3) {
        html += renderPhase3Lane();
    }
    return html;
}

function renderPhase1Lane() {
    // 判断节点：有邀请码吗
    let html = laneDecisionHTML('s1_decision_invite');

    // 分支
    html += `<div class="branch">
        <span class="edge">有 →</span>
        ${laneStepHTML('s1_frame')}
        <span class="edge">无 →</span>
        ${laneStepHTML('s1_nonframe')}
    </div>`;

    html += laneStepHTML('s1_1');
    html += laneStepHTML('s1_2');
    html += laneStepHTML('s1_3');
    return html;
}

function renderPhase2Lane() {
    // 前置判断：最近三个月 K1 竞价全量消耗是否达到 100 万
    let html = laneDecisionHTML('s2_decision_recent');

    // 当季门槛判断：是否申请政策激励
    html += laneDecisionHTML('s2_decision_spend');

    // 判断分支：是否申请政策激励
    const choice = progress['s2_decision_spend'] && progress['s2_decision_spend'].choice;
    html += `<div class="branch">
        <span class="edge">是 →</span>
        ${laneStepHTML('s2_4')}
        <span class="edge">否 →</span>
        ${laneStepHTML('s2_4_no')}
    </div>`;

    html += laneStepHTML('s2_5'); // 政策集团累量申请
    html += laneStepHTML('s2_supplier'); // 供应商入库
    html += laneStepHTML('s2_6'); // 合同签署
    return html;
}

function renderPhase3Lane() {
    // 始终展示完整布局，与当前开户方式无关的步骤由 isStepIrrelevant 灰掉
    const steps = FLOW.layout.phase3_default;
    return steps.map(item => laneStepHTML(item.ref)).join('');
}

// 判断节点（菱形）
function laneDecisionHTML(id) {
    const step = FLOW.steps[id];
    if (!step) return '';
    const p = progress[id];
    const isDone = p && (p.status === 'done' || p.status === 'skipped');
    const dimmed = isStepIrrelevant(id) ? ' dimmed' : '';
    const branches = (step.branches && step.branches.length)
        ? `<div class="decision-options">${step.branches.map(b =>
            `<div class="decision-opt"><span class="dopt-label">${b.label}</span><span class="dopt-target">${b.label2}</span></div>`
        ).join('')}</div>`
        : '';
    return `
        <div class="step${dimmed}">
            <span class="dot dec"></span>
            <details class="card dec" data-id="${id}" data-decision="1">
                <summary>
                    <span class="name">${step.name}</span>
                    <span class="tag">判断</span>
                </summary>
                <div class="detail">${branches}${laneDetailBody(step)}</div>
            </details>
        </div>`;
}

// 普通步骤卡片（可展开）
function laneStepHTML(id) {
    const step = FLOW.steps[id];
    if (!step) return '';
    const p = progress[id];
    const status = p && p.status;
    const isDone = status === 'done';
    const isSkipped = status === 'skipped';

    // 类型 class
    let typeClass = '';
    if (step.tag === 'required' || step.tag === 'must') typeClass = 'req';
    else if (step.tag === 'optional') typeClass = 'opt';
    else if (step.tag === 'decision') typeClass = 'dec';
    else typeClass = 'req'; // credit / creditOnly / condition 等条件步骤也视为需操作，用实线

    // 编号
    let dotText = '—';
    if (step.letter) dotText = step.letter;
    else if (typeof step.order === 'number' && step.order > 0) dotText = step.order;
    const dotClass = (step.tag === 'optional') ? 'opt' : (step.letter ? 'letter' : '');

    // 分支类型（阶段1）
    const branchType = (id === 's1_frame') ? 'frame' : (id === 's1_nonframe' ? 'nonframe' : '');
    const isChosen = branchType && userType === branchType;

    const doneBadge = isDone ? '<span class="tag tag-done">已完成</span>' : '';
    const skipBadge = isSkipped ? '<span class="tag tag-skipped">已跳过</span>' : '';

    // 与当前开户方式无关的步骤：灰掉
    const dimmed = isStepIrrelevant(id) ? ' dimmed' : '';

    return `
        <div class="step ${isChosen ? 'chosen' : ''} ${isSkipped ? 'skipped' : ''}${dimmed}">
            <span class="dot ${dotClass} ${isDone ? 'done' : ''}">${dotText}</span>
            <details class="card ${typeClass} ${isDone ? 'done' : ''}" data-id="${id}" ${branchType ? `data-branch-type="${branchType}"` : ''}>
                <summary>
                    <span class="name">${step.name}</span>
                    <span class="${step.tagClass || 'tag'}">${step.tagText || TAG_TEXT[step.tag]}</span>
                </summary>
                <div class="detail">${laneDetailBody(step)}${doneBadge ? `<div class="lane-badges">${doneBadge}${skipBadge}</div>` : ''}</div>
            </details>
        </div>`;
}

// 场景化详情：s3_7 仅在「签框开户 + 达到10万门槛（申请政策激励）」时展示完整说明，
// 其余场景（非框开户 / 签框无政策）仅展示操作手册阅读说明
function getStepDetail(step) {
    if (step.id === 's3_7' && step.detail && step.detail.alt &&
        !(userType === 'frame' && !isNoPolicy())) {
        return { purpose: step.detail.alt.purpose, altOnly: true };
    }
    return step.detail;
}

// 详情内容（简化版：展示 summary 与关键说明，点击卡片内链接不触发弹窗）
function laneDetailBody(step) {
    const d = getStepDetail(step);
    let h = '';
    // 判断节点：summary 与 purpose 通常是同一句话，跳过 summary 避免重复
    if (step.summary && step.type !== 'decision' && !(d && d.altOnly)) h += `<p>${step.summary}</p>`;
    if (d) {
        if (d.purpose) h += `<p>${d.purpose}</p>`;
        if (d.conditions && d.conditions.length) {
            h += `<p><strong>条件门槛：</strong></p><ul>${d.conditions.map(c => `<li>${c}</li>`).join('')}</ul>`;
        }
        if (d.actions && d.actions.length) {
            if (!d.plainActions) h += `<p><strong>操作：</strong></p>`;
            h += `<ul>${d.actions.map(a => `<li>${a}</li>`).join('')}</ul>`;
        }
        if (d.callout) h += `<p class="muted">${d.callout}</p>`;
    }
    return h || '<p class="muted">此步骤无额外说明。</p>';
}

function bindLanesEvents() {
    // 卡片点击：分支类型直接切换；否则打开详情弹窗
    $$('#lanes-area .card').forEach(card => {
        card.addEventListener('click', (e) => {
            // 点击链接、summary 展开时不做跳转弹窗
            if (e.target.closest('a')) return;
            // 与当前开户方式无关的步骤：不可交互
            const stepEl = card.closest('.step');
            if (stepEl && stepEl.classList.contains('dimmed')) return;
            const bt = card.dataset.branchType;
            if (bt) {
                setUserType(bt);
                return;
            }
            // 判断节点不弹窗
            if (card.dataset.decision) return;
            openStep(card.dataset.id);
        });
    });
}

// 免登录模式：进度仅保存在内存，不做任何持久化（关闭/刷新页面即清空）
function saveProgress() {
    /* no-op：不写入任何本地存储 */
}

// ========== 详情弹窗 ==========
function openStep(id) {
    const step = FLOW.steps[id];
    if (!step) return;
    if (step.type === 'decision') return; // 判断节点不弹窗

    $('#detail-title').textContent = step.name;

    let tagsHTML = `<span class="${step.tagClass || TAG_CLASS[step.tag]}">${step.tagText || TAG_TEXT[step.tag]}</span>`;
    if (step.condition) {
        tagsHTML += `<span class="tag tag-condition">条件：${step.condition}</span>`;
    }
    if (step.creditNote) tagsHTML += `<span class="tag tag-condition">非框代理直达</span>`;
    $('#detail-tags').innerHTML = tagsHTML;

    let content = '';
    const d = getStepDetail(step) || {};

    if (d.purpose) content += `<h4>目的</h4><p>${d.purpose}</p>`;
    if (d.conditions) {
        content += `<h4>条件门槛（同时满足）</h4><ul>${d.conditions.map(c => `<li>${c}</li>`).join('')}</ul>`;
    }
    if (d.actions) {
        content += `<h4>操作步骤</h4><ul>${d.actions.map(a => `<li>${a}</li>`).join('')}</ul>`;
    }
    if (d.materials && d.materials.length) {
        content += `<h4>所需材料</h4><ul>${d.materials.map(m => `<li>${m}</li>`).join('')}</ul>`;
    }
    if (d.callout) content += `<div class="callout">${d.callout}</div>`;
    if (d.warn) content += `<div class="warn"><strong>注意：</strong>${d.warn}</div>`;
    if (d.email) {
        const e = d.email;
        content += `<h4>${e.title || '邮件申请模板（可直接复制）'}</h4>`;
        content += `<div class="email-box">`;
        content += `<div><strong>收件人：</strong>${e.to}</div>`;
        content += `<div><strong>抄送：</strong>${e.cc}</div>`;
        content += `<div><strong>邮件主题：</strong>${e.subject}</div>`;
        content += `<div><strong>邮件正文：</strong></div>`;
        content += `<p>${e.body}</p>`;
        if (e.items && e.items.length) {
            content += `<ul>${e.items.map(it => `<li>${it}</li>`).join('')}</ul>`;
        }
        content += `</div>`;
    }
    if (d.contact) content += `<h4>联系人</h4><p>${d.contact}</p>`;
    if (d.tips) content += `<h4>小贴士</h4><p>${d.tips}</p>`;
    if (d.creditNote) content += `<div class="callout">${d.creditNote}</div>`;

    $('#detail-content').innerHTML = content || '<p style="color:var(--text-2)">此步骤无需详细操作说明。</p>';

    // 底部按钮
    const p = progress[id];
    if (p && p.status === 'skipped') {
        $('#btn-skip-step').classList.add('hidden');
    } else {
        $('#btn-skip-step').classList.toggle('hidden', step.tag === 'required' || step.tag === 'must' || step.tag === 'creditOnly');
    }

    $('#btn-complete-step').dataset.id = id;
    $('#btn-complete-step').textContent = step.confirmText ? `✓ ${step.confirmText}` : '已完成';

    $('#detail-modal').classList.remove('hidden');
}

function closeModal() {
    $('#detail-modal').classList.add('hidden');
}

function bindModal() {
    $('#detail-close').addEventListener('click', closeModal);
    $('.modal-mask').addEventListener('click', closeModal);
    $('#decision-close').addEventListener('click', closeDecisionModal);
    $('#decision-modal .modal-mask').addEventListener('click', closeDecisionModal);

    $('#btn-complete-step').addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        progress[id] = { status: 'done' };
        saveProgress();
        closeModal();
        renderLanes();
        renderSummary();
    });

    $('#btn-skip-step').addEventListener('click', (e) => {
        const id = $('#btn-complete-step').dataset.id;
        progress[id] = { status: 'skipped' };
        saveProgress();
        closeModal();
        renderLanes();
        renderSummary();
    });
}

// ========== 摘要列表（逐步办理清单，拆分为「待办」+「已完成」） ==========
function renderSummary() {
    const ulTodo = $('#summary-list-todo');
    const ulDone = $('#summary-list-done');
    if (!ulTodo || !ulDone) return;

    // 前 3 项办结后「当季全量消耗」问题才应出现，此处同步刷新顶部判断区
    renderPolicyArea();
    maybePromptPolicy();

    // 「我的待办」板块始终展示，引导提示渲染在待办描述下方、具体待办上方
    renderFlowHint();
    // 「申请政策激励」确认提示：展示在待办列表最上方（不计入待办）
    renderPolicyNotice();

    const card = $('#summary-card');
    if (card) card.classList.remove('hidden');

    // 尚未选择开户方式：不展示具体待办列表，仅由板块内的引导提示引导用户先做选择
    if (!userType) {
        $$('#summary-card .summary-part').forEach(part => part.classList.add('hidden'));
        ulTodo.innerHTML = '';
        ulDone.innerHTML = '';
        $('#summary-todo-count').textContent = '0';
        $('#summary-done-count').textContent = '0';
        return;
    }
    $$('#summary-card .summary-part').forEach(part => part.classList.remove('hidden'));

    const todoItems = [];
    const doneItems = [];

    // 按批次 + 开户方式，取当前应展示的步骤
    const visibleIds = getVisibleStepIds();

    visibleIds.forEach(id => {
        const step = FLOW.steps[id];
        if (!step) return;

        let p = progress[id];
        if (!p) {
            todoItems.push({ id, status: 'todo', optional: step.tag === 'optional' });
        } else if (p.status === 'done') {
            doneItems.push({ id, status: 'done', optional: step.tag === 'optional' });
        } else if (p.status === 'skipped') {
            // 已跳过的归入「已完成」区
            doneItems.push({ id, status: 'skipped', optional: step.tag === 'optional' });
        }
    });

    // 计数
    $('#summary-todo-count').textContent = todoItems.length;
    $('#summary-done-count').textContent = doneItems.length;

    // ── Part 1：待办 ──
    if (!todoItems.length) {
        ulTodo.innerHTML = '<div class="summary-empty">🎉 太棒了！当前所有待办都已完成。</div>';
    } else {
        // 找到第一个「待办」且为必做（非选做）的步骤，作为当前步骤自动展开
        const firstTodoIndex = todoItems.findIndex(it => !it.optional);

        ulTodo.innerHTML = todoItems.map((it, idx) => {
            const step = FLOW.steps[it.id];
            const isOptionalTodo = it.optional;
            const isCurrent = idx === firstTodoIndex;
            const openAttr = isCurrent ? ' open' : '';

            const statusClass = isOptionalTodo ? 'optional' : '';
            const statusText = isOptionalTodo ? (step.tagText || '选做') : '待办';
            const body = laneDetailBody(step);

            const completeText = step.confirmText ? `✓ ${step.confirmText}` : '✓ 完成';
            let actions = `<div class="summary-actions">
                <button class="summary-complete-btn" data-id="${it.id}">${completeText}</button>
                ${step.tag !== 'required' && step.tag !== 'must' && step.tag !== 'creditOnly' ? `<button class="summary-skip-btn" data-id="${it.id}">跳过</button>` : ''}
            </div>`;

            const currentBadge = isCurrent ? '<span class="summary-current-badge">当前步骤</span>' : '';

            return `<li class="summary-item ${statusClass}${isCurrent ? ' current' : ''}">
                <details class="summary-details" data-id="${it.id}"${openAttr}>
                    <summary>
                        <span class="summary-num">${idx + 1}</span>
                        <div class="summary-name ${statusClass}">${step.name}</div>
                        <span class="${step.tagClass || TAG_CLASS[step.tag]}" style="margin-right:8px">${step.tagText || TAG_TEXT[step.tag]}</span>
                        ${currentBadge}
                        <span class="summary-status">${statusText}</span>
                    </summary>
                    <div class="summary-detail-body">
                        ${body}
                        ${actions}
                    </div>
                </details>
            </li>`;
        }).join('');
    }

    // ── Part 2：已完成 ──
    if (!doneItems.length) {
        ulDone.innerHTML = '<div class="summary-empty" style="padding:8px 0">还没有完成的步骤。</div>';
    } else {
        ulDone.innerHTML = doneItems.map((it, idx) => {
            const step = FLOW.steps[it.id];
            const statusClass = it.status === 'done' ? 'done' : 'skipped';
            const statusText = it.status === 'done' ? '已完成' : '已跳过';

            return `<li class="summary-item ${statusClass}">
                <details class="summary-details" data-id="${it.id}">
                    <summary>
                        <span class="summary-num ${it.status === 'done' ? 'done' : ''}">✓</span>
                        <div class="summary-name ${statusClass}">${step.name}</div>
                        <span class="${step.tagClass || TAG_CLASS[step.tag]}" style="margin-right:8px">${step.tagText || TAG_TEXT[step.tag]}</span>
                        <span class="summary-status">${statusText}</span>
                    </summary>
                    <div class="summary-detail-body">
                        ${laneDetailBody(step)}
                        <div class="summary-actions">
                            <button class="summary-reset-btn" data-id="${it.id}">↺ 重做</button>
                        </div>
                    </div>
                </details>
            </li>`;
        }).join('');
    }

    // ── 绑定按钮 ──
    $$('#summary-list-todo .summary-complete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            progress[btn.dataset.id] = { status: 'done' };
            saveProgress();
            renderLanes();
            renderSummary();
        });
    });
    $$('#summary-list-todo .summary-skip-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            progress[btn.dataset.id] = { status: 'skipped' };
            saveProgress();
            renderLanes();
            renderSummary();
        });
    });
    $$('#summary-list-done .summary-reset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            delete progress[btn.dataset.id];
            saveProgress();
            renderLanes();
            renderSummary();
        });
    });
}
window.openStep = openStep;

// 摘要里点击判断节点：弹出选择弹窗
function openDecision(id) {
    const step = FLOW.steps[id];
    if (!step || step.type !== 'decision') return;
    const branches = step.branches || [];
    if (!branches.length) return;

    $('#decision-title').textContent = step.name;
    const promptText = step.detail && step.detail.purpose ? step.detail.purpose : (step.summary || '');
    $('#decision-prompt').innerHTML = `<p>${promptText}</p>`;

    const choicesEl = $('#decision-choices');
    const currentP = progress[id];
    const currentChoice = currentP && currentP.choice;
    choicesEl.innerHTML = branches.map(b => `
        <button class="decision-choice-btn${b.target === currentChoice ? ' selected' : ''}" data-target="${b.target}">
            <span class="dopt-label">${b.label}</span>
            <span class="dopt-target">${b.label2}</span>
        </button>
    `).join('');

    // 绑定选择事件
    $$('#decision-choices .decision-choice-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setDecisionChoice(id, btn.dataset.target);
            closeDecisionModal();
            // 选择完后自动滚动到泳道图对应判断节点并展开，让用户看到分支
            const card = document.querySelector(`#lanes-area .card[data-id="${id}"]`);
            if (card && card.tagName === 'DETAILS') {
                card.open = true;
                if (typeof card.scrollIntoView === 'function') {
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        });
    });

    $('#decision-modal').classList.remove('hidden');
}
window.openDecision = openDecision;

function closeDecisionModal() {
    const m = $('#decision-modal');
    if (m) m.classList.add('hidden');
}
window.closeDecisionModal = closeDecisionModal;

function setDecisionChoice(id, choice) {
    progress[id] = { status: 'done', choice };
    saveProgress();
    renderPolicyArea();
    renderLanes();
    renderSummary();
}
window.setDecisionChoice = setDecisionChoice;

// ========== 启动 ==========
function init() {
    bindGlobal();
    bindModal();

    // 免登录：直接进入主页面
    enterApp();
}

document.addEventListener('DOMContentLoaded', init);

// 注入额外样式
(function injectExtraStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .usertype-bar {
            background: #FFFBEB; border-bottom: 1px solid #FEF3C7;
            padding: 10px 40px;
        }
        .usertype-inner {
            max-width: 1180px; margin: 0 auto;
            display: flex; align-items: center; gap: 12px; font-size: 13px;
        }
        .badge-orange {
            background: var(--orange); color: #fff;
            padding: 2px 10px; border-radius: 4px; font-size: 12px; font-weight: 600;
        }
        .badge-blue {
            background: var(--primary); color: #fff;
            padding: 2px 10px; border-radius: 4px; font-size: 12px; font-weight: 600;
        }
        .link-btn {
            margin-left: auto; background: transparent; border: none;
            color: var(--primary); cursor: pointer; font-size: 13px;
        }
        .link-btn:hover { text-decoration: underline; }
    `;
    document.head.appendChild(style);
})();
