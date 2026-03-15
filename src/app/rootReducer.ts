import { combineReducers } from '@reduxjs/toolkit';
import assessmentReducer from '../features/assessment/slices/assessmentSlice';
import candidateReducer from '../features/candidate/slices/candidateSlice';

export const rootReducer = combineReducers({
    assessment: assessmentReducer,
    candidate: candidateReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
