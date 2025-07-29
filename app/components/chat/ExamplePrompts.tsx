import React from 'react';

// Function to shuffle an array
const shuffleArray = (array: any[]) => {
  const newArray = [...array];

  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }

  return newArray;
};

const ALL_EXAMPLE_PROMPTS = [
  {
    type: '设计',
    title: '设计团队协作平台',
    text: '创建一个设计团队的协作平台，包含设计稿管理、评审流程、资源库等功能，风格要简洁现代。',
  },
  {
    type: '运输',
    title: '仓储物流库存管理',
    text: '创建一个仓储物流的库存管理页面，包含库存状态、出入库记录、库位管理等功能，风格要实用清晰。',
  },
  {
    type: '教育',
    title: '在线教育课程列表',
    text: '创建一个在线教育平台的课程列表页，包含课程分类、搜索筛选、课程卡片等模块，风格要专业且友好。',
  },
  {
    type: '医疗',
    title: '医院在线预约挂号',
    text: '创建一个医院在线预约的挂号页面，包含科室选择、医生排班、预约时段等功能，设计要清晰易用。',
  },
  {
    type: '数据',
    title: '数据分析仪表盘',
    text: '创建一个数据分析仪表盘首页，包含数据概览卡片、折线图表、任务列表等模块，使用商务风格设计。',
  },
  {
    type: '工具',
    title: '营销素材管理平台',
    text: '创建一个营销素材管理平台的资源库，包含素材分类、权限管理、使用分析等功能，风格要时尚专业。',
  },
  {
    type: '金融',
    title: '加密货币交易平台',
    text: '创建一个加密货币交易平台的交易页面，包含实时行情、交易操作、深度图表等功能，风格要科技感强。',
  },
  {
    type: '企业',
    title: '企业知识库',
    text: '创建一个企业知识管理平台的文档中心，包含知识分类、全文检索、协作编辑等功能，设计要专业规范。',
  },
  {
    type: '电商',
    title: '电商平台商品页',
    text: '创建一个电商平台的商品详情页面，包含商品展示、用户评价、推荐商品等功能，设计要吸引用户购买。',
  },
  {
    type: '社交',
    title: '社交媒体个人主页',
    text: '创建一个社交媒体的个人主页，包含个人信息、动态发布、好友互动等功能，设计要个性化且易用。',
  },
  {
    type: '新闻',
    title: '新闻资讯聚合页',
    text: '创建一个新闻资讯的聚合页面，包含分类浏览、热点推荐、评论互动等功能，设计要信息清晰。',
  },
  {
    type: '旅游',
    title: '旅游攻略规划页',
    text: '创建一个旅游攻略的规划页面，包含目的地推荐、行程安排、游记分享等功能，设计要激发用户兴趣。',
  },
  {
    type: '健身',
    title: '健身训练计划页',
    text: '创建一个健身训练的计划页面，包含训练课程、进度追踪、营养建议等功能，设计要激励用户坚持。',
  },
  {
    type: '音乐',
    title: '音乐播放器界面',
    text: '创建一个音乐播放器的界面，包含歌曲播放、歌单管理、歌词显示等功能，设计要符合音乐氛围。',
  },
  {
    type: '游戏',
    title: '游戏社区论坛',
    text: '创建一个游戏社区的论坛页面，包含话题讨论、攻略分享、玩家互动等功能，设计要符合游戏文化。',
  },
  {
    type: '财务',
    title: '个人财务管理页',
    text: '创建一个个人财务管理的页面，包含收支记录、预算规划、投资分析等功能，设计要安全且直观。',
  },
  {
    type: '健康',
    title: '健康档案管理页',
    text: '创建一个健康档案的管理页面，包含体检记录、用药提醒、健康分析等功能，设计要专业且贴心。',
  },
];

// Simple mapping of types to icon names (using iconify classes)
const TYPE_ICONS: Record<string, string> = {
  设计: 'i-ph:paint-brush',
  运输: 'i-ph:truck',
  教育: 'i-ph:graduation-cap',
  医疗: 'i-ph:heartbeat',
  数据: 'i-ph:chart-line',
  工具: 'i-ph:megaphone',
  金融: 'i-ph:currency-circle-dollar',
  企业: 'i-ph:building',
  电商: 'i-ph:shopping-cart',
  社交: 'i-ph:users',
  新闻: 'i-ph:newspaper',
  旅游: 'i-ph:map-pin',
  健身: 'i-ph:person-simple-run',
  音乐: 'i-ph:music-note',
  游戏: 'i-ph:game-controller',
  财务: 'i-ph:bank',
  健康: 'i-ph:first-aid-kit',
};

// Generate initial prompts
const initialPrompts = shuffleArray(ALL_EXAMPLE_PROMPTS).slice(0, 4);

export function ExamplePrompts(sendMessage?: { (event: React.UIEvent, messageInput?: string): void | undefined }) {
  return (
    <div id="examples" className="relative flex flex-col gap-6 w-full max-w-3xl mx-auto flex justify-center mt-6">
      <div className="flex justify-between items-center w-full">
        <h2 className="text-lg font-semibold text-bolt-elements-textPrimary">创作提示</h2>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors"
        >
          换一换
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {initialPrompts.map((examplePrompt, index) => (
          <div
            key={`${index}-${examplePrompt.type}`}
            onClick={(event) => {
              sendMessage?.(event, examplePrompt.text);
            }}
            className="flex items-start gap-2 p-2 text-left rounded-lg bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-700/50 hover:bg-gray-100/50 dark:hover:bg-gray-700/30 group hover:text-purple-500 dark:hover:text-purple-400 group cursor-pointer transition-theme w-full"
          >
            <div className="flex flex-col items-center gap-1 pt-0.5">
              <div
                className={`${TYPE_ICONS[examplePrompt.type] || 'i-ph:question'} text-lg text-gray-400 dark:text-gray-500 group-hover:text-purple-500 dark:group-hover:text-purple-400`}
              ></div>
              <span className="text-[10px] px-2 py-0.5 rounded-full min-w-[32px] text-center bg-gray-100 dark:bg-gray-700/70 text-gray-500 dark:text-gray-400 group-hover:text-purple-500 dark:group-hover:text-purple-400 whitespace-nowrap leading-none">
                {examplePrompt.type}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-purple-500 dark:group-hover:text-purple-400 mb-0.5 truncate">
                {examplePrompt.title}
              </div>
              <div
                className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-purple-500 dark:group-hover:text-purple-400 line-clamp-1"
                title={examplePrompt.text}
              >
                {examplePrompt.text}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
