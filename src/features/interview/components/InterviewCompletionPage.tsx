import React from 'react';

const InterviewCompletionPage: React.FC = () => {
    return (
        <div className="fixed inset-0 bg-slate-50 font-sans p-6 text-slate-900 overflow-hidden flex flex-col items-center justify-center">
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-12 text-center border border-slate-100">
                <div className="size-24 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-8 animate-bounce">
                    <span className="material-symbols-outlined text-5xl font-black">check_circle</span>
                </div>
                <h1 className="text-4xl font-black text-slate-900 mb-6">Interview Completed!</h1>
                <p className="text-lg text-slate-600 mb-10 leading-relaxed font-medium">
                    Thank you for your time. Your assessment session has been successfully recorded and submitted for evaluation.
                    Our AI models will analyze your performance and notify the recruitment team.
                </p>
                <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                    <p className="text-sm font-bold text-blue-700 uppercase tracking-widest mb-2">Next Steps</p>
                    <p className="text-xs text-blue-600 leading-relaxed">
                        You can close this window now. You will receive an update regarding your assessment status via email.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default InterviewCompletionPage;
