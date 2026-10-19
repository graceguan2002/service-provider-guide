// K1新代理准入流程数据 - 严格按最新版流程图整理
// tag 类型: required(必选)、must(必读)、optional(非必选)、decision(判断)、credit(条件严格)、condition(消耗≥50万)、frame(签框/非框)

const FLOW = {
    phases: [
        {
            id: 1, name: '准入前', desc: '开户准备', key: 'phase1',
            intro: '在正式合作前，您需要先完成服务商账户的开户、对公验证和保证金缴纳。'
        },
        {
            id: 2, name: '准入期', desc: '资质与合同', key: 'phase2',
            intro: '完成开户后，您需要按需申请政策激励，完成合同签署并归档。'
        },
        {
            id: 3, name: '准入后', desc: '基础功能与规范', key: 'phase3',
            intro: '完成实名认证、基础功能开通、服务商管理规范必读，并按需申请合作证明、授信等。'
        }
    ],

    // 步骤定义
    steps: {
        // ========= 阶段1 准入前 =========
        s1_decision_invite: {
            id: 's1_decision_invite', phase: 1, type: 'decision',
            name: '有邀请码吗？',
            tag: 'decision', order: 0,
            summary: '根据是否有邀请码，选择不同的开户方式。',
            branches: [
                { label: '有 →', target: 's1_frame', label2: '（a）签框开户' },
                { label: '无 →', target: 's1_nonframe', label2: '（b）非框开户' }
            ]
        },
        s1_frame: {
            id: 's1_frame', phase: 1, indent: 1, branch: true,
            name: '签框开户', letter: 'a',
            tag: 'required',
            summary: '填写邀请码，补充开户资质，挂接人户。',
            detail: {
                purpose: '通过邀请码挂接至指定渠道经理，享受一对一服务。',
                actions: [
                    '登录服务商系统，选择【签框开户】',
                    '填写您收到的邀请码（请联系对应渠道经理获取）',
                    '补充公司开户资质（营业执照、商标/品牌授权、行业资质等）',
                    '挂接到对应的人户（渠道经理）'
                ],
                materials: ['营业执照', '法人身份证', '商标注册证或品牌授权链路', '邀请码'],
                contact: '请联系您的对接渠道经理获取邀请码并协助挂接'
            }
        },
        s1_nonframe: {
            id: 's1_nonframe', phase: 1, indent: 1, branch: true,
            name: '非框开户', letter: 'b',
            tag: 'required',
            summary: '选择非框，补充开户资质。',
            detail: {
                purpose: '无邀请码时的开户通道，自主选择非框开户。',
                actions: [
                    '登录服务商系统，选择【非框开户】',
                    '补充公司开户资质（营业执照、商标/品牌授权、行业资质等）'
                ],
                materials: ['营业执照', '法人身份证', '商标注册证或品牌授权链路']
            }
        },
        s1_1: {
            id: 's1_1', phase: 1,
            name: '开通服务商端口',
            tag: 'required', order: 1,
            summary: '注册并开通腾讯营销服务商账户。',
            detail: {
                purpose: '在腾讯营销服务商系统建立您公司的服务商账户，是后续所有操作的前提。',
                actions: [
                    '开户链接：<a href="https://e.qq.com/new-agency-reg" target="_blank">https://e.qq.com/new-agency-reg</a>',
                    '开户相关 Q&A：<a href="https://support.e.qq.com/detail?cid=5149&pid=13039" target="_blank">https://support.e.qq.com/detail?cid=5149&pid=13039</a>'
                ],
                materials: ['营业执照（原件扫描件）', '法人身份证正反面', '对公账户信息', '办公地址证明'],
                tips: '请保管好您的账户密码，建议绑定手机号用于安全验证。'
            }
        },
        s1_2: {
            id: 's1_2', phase: 1, name: '完成对公验证', tag: 'required', order: 2,
            summary: '通过服务商系统完成对公账户验证。',
            detail: {
                purpose: '首次注册并登录服务商系统后，务必完成对公验证，确保资金往来合规。',
                actions: [
                    '操作指引：<a href="https://bbx-pic.gtimg.com/bbx/pictures/2026/382_20260602174258_802141.pdf" target="_blank">https://bbx-pic.gtimg.com/bbx/pictures/2026/382_20260602174258_802141.pdf</a>'
                ]
            }
        },
        s1_3: {
            id: 's1_3', phase: 1, name: '缴纳准入保证金 ¥10 万', tag: 'required', order: 3,
            summary: '向腾讯营销缴纳准入保证金 10 万元人民币。',
            detail: {
                purpose: '准入保证金是合作的基础门槛，仅用于风控担保。',
                actions: [
                    '操作链接：<a href="https://e.qq.com/agency/reg?cid=4426&pid=12396" target="_blank">https://e.qq.com/agency/reg?cid=4426&pid=12396</a>'
                ],
                materials: ['对公账户信息', '保证金缴纳凭证'],
                callout: '完成开户、对公验证、保证金缴纳后方可正常使用服务商系统功能。',
                tips: '请关注保证金退还机制及合作终止时的退还流程。'
            }
        },

        // ========= 阶段2 准入期 =========
        // 前置判断：最近三个月 K1 竞价全量消耗是否达到 100 万（未达到则无需再判断当季门槛）
        s2_decision_recent: {
            id: 's2_decision_recent', phase: 2, type: 'decision',
            name: '最近三个月 K1 竞价全量消耗是否达到 100 万？',
            tag: 'decision', order: 0,
            summary: '先识别最近三个月 K1 竞价全量消耗是否达到 100 万，未达到则无需再判断当季门槛。',
            branches: [
                { label: '是 →', target: 's2_recent_yes', label2: '继续判断当季 K1 竞价全量消耗' },
                { label: '否 →', target: 's2_recent_no', label2: '无政策，直接进入准入后步骤' }
            ],
            detail: {
                purpose: '「最近三个月」指从今天往前推三个月的区间，例如今天是 2026年8月8日，则统计区间为 2026年5月8日—2026年8月8日。'
            }
        },
        s2_decision_spend: {
            id: 's2_decision_spend', phase: 2, type: 'decision',
            name: '当季 K1 竞价全量消耗 ≥10 万？',
            tag: 'decision', order: 0,
            summary: '识别当季 K1 竞价全量消耗是否达到 10 万门槛，以决定是否可申请政策激励。',
            branches: [
                { label: '是 →', target: 's2_4', label2: '申请政策激励' },
                { label: '否 →', target: 's2_4_no', label2: '无政策 / 自主放弃' }
            ],
            detail: {
                purpose: '识别当季 K1 竞价全量消耗是否达到 10 万门槛，以决定是否可申请政策激励。「当季」指当前自然季度起始日至今天，例如今天是 2026年8月8日，则统计区间为 2026年7月1日—2026年8月8日。',
                actions: [
                    '服务商自行查看本季度总消耗：服务商系统「投放」→「报表」→「服务商维度」→ 日期范围选择"本季度"，离线下载 → 进入「服务商下载中心」下载具体数据。'
                ]
            }
        },
        s2_4: {
            id: 's2_4', phase: 2, indent: 1, branch: true,
            name: '申请政策激励',
            tag: 'required', order: 4,
            summary: '当季 K1 竞价全量消耗 ≥10 万时申请政策激励。',
            detail: {
                purpose: '完成季度消耗门槛后获得平台返点与流量支持。',
                actions: [
                    '登录服务商系统，进入【政策激励】',
                    '核对当季消耗数据是否符合条件',
                    '提交激励申请，系统审核通过后自动生效'
                ],
                conditions: [
                    '当季 K1 竞价全量消耗 ≥10 万',
                    '当季度完成合同归档',
                    '有效人户挂接'
                ],
                materials: ['当季全量消耗数据截图', '企业基本信息']
            }
        },
        s2_4_no: {
            id: 's2_4_no', phase: 2, indent: 1, branch: true,
            name: '无政策 / 自主放弃',
            tag: 'optional',
            summary: '未达门槛或自主放弃，无需操作。',
            detail: {
                purpose: '未达门槛或自主放弃。',
                actions: ['本步骤无需操作，跳过即可。']
            }
        },
        s2_supplier: {
            id: 's2_supplier', phase: 2, name: '供应商入库',
            tag: 'optional', order: 0,
            confirmText: '已知',
            summary: '涉及品牌返点。如需入库：提供相关信息，渠道经理协助提报；否则无需操作。',
            detail: {
                purpose: '对接品牌返点需入库备案，确保返点链路完整。',
                contact: '联系您的渠道经理协助提报'
            }
        },
        s2_5: {
            id: 's2_5', phase: 2, name: '政策集团累量申请', tag: 'required', order: 5,
            summary: '请联系渠道经理完成新增政策集团标签设置，并邮件申请配置服务商政策激励主账户。',
            detail: {
                actions: [
                    '1. 请联系渠道经理完成新增政策集团标签设置。集团内多家代理的广告消耗合并计算，便于达到更高政策门槛。',
                    '2. 完成政策集团申请后，请参照 <a href="https://support.e.qq.com/detail?cid=4080&pid=11017" target="_blank">https://support.e.qq.com/detail?cid=4080&pid=11017</a> 中「申请配置服务商政策激励主账户」的邮件模板，发送邮件申请。今后可在系统内查询相关政策内容。'
                ]
            }
        },
        s2_6: {
            id: 's2_6', phase: 2, name: '合同签署', tag: 'required', order: 6,
            summary: '开通电子签，并完成合同签署及归档。',
            detail: {
                actions: [
                    '请参考电子签署指引 <a href="https://doc.weixin.qq.com/doc/w3_AQAAOAYtAGoCNYG1JJFVOR0autcEZ?scode=AJEAIQdfAAooWj0obcAHcAdAbGACc" target="_blank">点此查看电子签署指引</a> 完成合同签署及归档，确保合作法律效力。'
                ]
            }
        },

        // ========= 阶段3 准入后 =========
        s3_7: {
            id: 's3_7', phase: 3, name: '服务商系统基础能力开通', tag: 'required', order: 7,
            summary: '',
            detail: {
                plainActions: true,
                actions: [
                    '1. 请仔细阅读服务商系统操作手册，明确各板块功能及作用，确保功能使用正常：<a href="https://docs.qq.com/doc/DRGxRUGZsY3ZMZUNY?nlc=1" target="_blank">https://docs.qq.com/doc/DRGxRUGZsY3ZMZUNY?nlc=1</a>',
                    '2. 开通成长中心查看E赋能相关。请将以下信息提报给渠道经理，协助提报：服务商政策集团名称、申请人服务商系统 userid、申请人职位',
                    '* 因产品数据内容包含集团全量数据，建议仅针对管理层开放。'
                ],
                alt: {
                    purpose: '请仔细阅读服务商系统操作手册，明确各板块功能及作用，确保功能使用正常：<a href="https://docs.qq.com/doc/DRGxRUGZsY3ZMZUNY?nlc=1" target="_blank">https://docs.qq.com/doc/DRGxRUGZsY3ZMZUNY?nlc=1</a>'
                }
            }
        },
        s3_8: {
            id: 's3_8', phase: 3, name: '基础业务功能开通', tag: 'required', order: 8,
            summary: '开通成长中心、政策全景看板，查看相对应的政策内容。',
            detail: {
                purpose: '开通成长中心、政策全景看板查看相对应的政策内容。请将以下链接中提及的信息提报给渠道经理，协助提报。',
                actions: [
                    '1. 成长中心请提供以下信息：服务商政策集团名称、申请人服务商系统 userid、申请人职位',
                    '* 因产品数据内容包含集团全量数据，建议仅针对管理层开放。',
                    '2. 政策全景看板：<a href="https://support.e.qq.com/detail?cid=4080&pid=11017" target="_blank">https://support.e.qq.com/detail?cid=4080&pid=11017</a>',
                    '请参照「申请配置服务商政策激励主账户」的邮件模板，发送邮件进行申请。'
                ]
            }
        },
        s3_10: {
            id: 's3_10', phase: 3, name: '合作证明申请', tag: 'condition', order: 9,
            confirmText: '已知',
            summary: '',
            detail: {
                purpose: '账户有效 + 已缴保证金 + 完成身份验证，且当季度全量消耗 ≥50 万，自动颁发官方合作证明，可用于对外宣传。请联系您的渠道经理/管理组获取。'
            }
        },
        s3_upgrade: {
            id: 's3_upgrade', phase: 3, name: '升级主体 / 集团管理', tag: 'optional', order: 0,
            summary: '',
            detail: {
                purpose: '随着业务扩大，可升级服务商品牌或加入集团管理，详见说明文档：<a href="https://doc.weixin.qq.com/doc/w3_APkAbAaEACgMNonDAClRtif8uSJ9b?scode=AJEAIQdfAAoNdSBWoNAHcAdAbGACc" target="_blank">https://doc.weixin.qq.com/doc/w3_APkAbAaEACgMNonDAClRtif8uSJ9b?scode=AJEAIQdfAAoNdSBWoNAHcAdAbGACc</a>'
            }
        },
        s3_11: {
            id: 's3_11', phase: 3, name: '授信申请', tag: 'credit', order: 10,
            confirmText: '已知',
            summary: '',
            detail: {
                purpose: '申请腾讯营销授信额度，缓解资金压力。',
                actions: [
                    '满足以上所有条件的代理，请联系渠道经理或者管理组协助申请，并报备业务经营状况及历史情况。'
                ],
                conditions: [
                    '签框代理（非框不适用）',
                    '预付时长 ≥ 6 个月',
                    '近 6 个月月均消耗 ≥ 500 万元',
                    '集团 CAS 信用评级 ≥ C（含担保）'
                ],
                contact: '联系您的渠道经理协助申请'
            }
        },
        s3_12: {
            id: 's3_12', phase: 3, name: '预估提报', tag: 'creditOnly', order: 11,
            confirmText: '已知',
            summary: '',
            detail: {
                purpose: '授信代理需要定期预估后续消耗，便于平台资源规划。按月盘点月度/季度/年度消耗预估，渠道经理协助提报系统申请。',
                contact: '联系您的渠道经理协助提报'
            }
        },
        s3_13: {
            id: 's3_13', phase: 3, name: '阅读服务商管理规范', tag: 'required', order: 12,
            summary: '',
            detail: {
                plainActions: true,
                purpose: '明确平台对服务商的管理要求与红线，避免违规。',
                actions: [
                    '文档链接：<a href="https://doc.weixin.qq.com/doc/w3_AGwAgQbLACoCNLdfKbeRCSRqywIjy" target="_blank">https://doc.weixin.qq.com/doc/w3_AGwAgQbLACoCNLdfKbeRCSRqywIjy</a>'
                ]
            }
        },
        s3_star: {
            id: 's3_star', phase: 3, name: '星链启航营', tag: 'optional', order: 13,
            tagText: '推荐',
            tagClass: 'tag tag-recommend',
            summary: '',
            detail: {
                purpose: '星链启航营是官方赋能成长课程，为后续服务商评级晋升的必要条件，推荐各位服务商伙伴学习：<a href="https://eschool.qq.com/activity/special?id=68" target="_blank">https://eschool.qq.com/activity/special?id=68</a>'
            }
        },
        s3_honor: {
            id: 's3_honor', phase: 3, name: 'K1服务商荣誉认证', tag: 'optional', order: 14,
            summary: '',
            detail: {
                purpose: 'SAB及合伙人相关详见「对外版管理规范文档」（<a href="https://doc.weixin.qq.com/doc/w3_AGwAgQbLACoCNLdfKbeRCSRqywIjy" target="_blank">https://doc.weixin.qq.com/doc/w3_AGwAgQbLACoCNLdfKbeRCSRqywIjy</a>）第三章内容或渠道一站式平台的「电商信息管理板块」。评选SAB或合伙人可获得官方能力背书，提升品牌公信力。'
            }
        }
    },

    // 编排每个阶段的列表（带条件分支）
    layout: {
        phase1: [
            { type: 'decision', ref: 's1_decision_invite' },
            { type: 'step', ref: 's1_1' },
            { type: 'step', ref: 's1_2' },
            { type: 'step', ref: 's1_3' }
        ],
        phase2: [
            { type: 'decision', ref: 's2_decision_recent' },
            { type: 'decision', ref: 's2_decision_spend' },
            { type: 'step', ref: 's2_5' },
            { type: 'step', ref: 's2_supplier' },
            { type: 'step', ref: 's2_6' }
        ],
        phase3_default: [
            { type: 'step', ref: 's3_7' },
            { type: 'step', ref: 's3_8' },
            { type: 'step', ref: 's3_10' },  // 合作证明 - 消耗≥50万
            { type: 'step', ref: 's3_upgrade' },  // 升级主体 - 非必选
            { type: 'step', ref: 's3_11' },  // 授信 - 条件严格
            { type: 'step', ref: 's3_12' },  // 预估提报 - 仅授信代理
            { type: 'step', ref: 's3_13' },  // 必读
            { type: 'step', ref: 's3_star' },
            { type: 'step', ref: 's3_honor' }
        ],
        phase3_nonframe: [
            { type: 'step', ref: 's3_7' },
            { type: 'step', ref: 's3_10' },
            { type: 'step', ref: 's3_13' }
        ]
    }
};

// 标签映射
const TAG_TEXT = {
    required: '必做',
    must: '必读',
    optional: '选做',
    decision: '判断',
    credit: '条件严格',
    creditOnly: '仅授信代理',
    condition: '消耗≥50万',
    frame: '签框/非框',
    skip: '无需操作'
};

const TAG_CLASS = {
    required: 'tag tag-required',
    must: 'tag tag-must',
    optional: 'tag tag-optional',
    decision: 'tag tag-must',
    credit: 'tag tag-credit',
    creditOnly: 'tag tag-credit',
    condition: 'tag tag-condition',
    frame: 'tag tag-frame',
    skip: 'tag tag-skip'
};
