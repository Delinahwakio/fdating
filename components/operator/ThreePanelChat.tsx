'use client'

import { FC, ReactNode } from 'react'
import { GlassCard } from '@/components/shared/GlassCard'

interface ThreePanelChatProps {
  leftPanel: ReactNode
  centerPanel: ReactNode
  rightPanel: ReactNode
}

export const ThreePanelChat: FC<ThreePanelChatProps> = ({
  leftPanel,
  centerPanel,
  rightPanel
}) => {
  return (
    <div className="h-full w-full flex gap-4 p-4 bg-[#0F0F23]">
      {/* Left Panel - Real User Profile */}
      <div className="w-80 flex-shrink-0 hidden lg:block">
        <GlassCard className="h-full overflow-y-auto">
          {leftPanel}
        </GlassCard>
      </div>

      {/* Center Panel - Chat Interface */}
      <div className="flex-1 min-w-0">
        <GlassCard className="h-full flex flex-col">
          {centerPanel}
        </GlassCard>
      </div>

      {/* Right Panel - Fictional Profile */}
      <div className="w-80 flex-shrink-0 hidden xl:block">
        <GlassCard className="h-full overflow-y-auto">
          {rightPanel}
        </GlassCard>
      </div>
    </div>
  )
}
