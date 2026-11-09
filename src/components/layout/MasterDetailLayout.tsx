import React from 'react';

interface MasterDetailLayoutProps {
  master: React.ReactNode;
  detail: React.ReactNode;
  hasSelectedDetail: boolean;
  onBackToMaster?: () => void;
  masterWidthClass?: string;
  emptyState?: React.ReactNode;
}

export const MasterDetailLayout: React.FC<MasterDetailLayoutProps> = ({
  master,
  detail,
  hasSelectedDetail,
  onBackToMaster,
  masterWidthClass = 'w-full md:w-80 lg:w-96',
  emptyState
}) => {
  return (
    <div className="w-full flex flex-col md:flex-row gap-4 lg:gap-6 min-h-[calc(100vh-140px)]">
      
      {/* Master Column (Left on Tablet/Desktop, Full on Mobile when no detail selected) */}
      <div 
        className={`${masterWidthClass} shrink-0 flex flex-col ${
          hasSelectedDetail ? 'hidden md:flex' : 'flex'
        }`}
      >
        {master}
      </div>

      {/* Detail Column (Right on Tablet/Desktop, Full on Mobile when detail selected) */}
      <div 
        className={`flex-1 flex flex-col min-w-0 ${
          !hasSelectedDetail ? 'hidden md:flex' : 'flex'
        }`}
      >
        {hasSelectedDetail ? (
          <div className="flex-1 w-full bg-[#FFFFFF] border border-[#E2E2E2] rounded-2xl md:rounded-3xl p-4 sm:p-6 lg:p-7 shadow-sm overflow-y-auto text-[#111111]">
            {detail}
          </div>
        ) : (
          emptyState || (
            <div className="hidden md:flex flex-col items-center justify-center flex-1 bg-[#F1F1F1] border border-dashed border-[#E2E2E2] rounded-3xl p-8 text-center text-[#5F5F5F]">
              <p className="text-sm font-medium">Selecione um item da lista ao lado para visualizar os detalhes.</p>
            </div>
          )
        )}
      </div>

    </div>
  );
};
