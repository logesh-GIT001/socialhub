"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { ChevronLeft, ChevronRight, Calendar, Clock, Layers, User, Loader2 } from "lucide-react";

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayPosts, setSelectedDayPosts] = useState<any[] | null>(null);
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  // Fetch all posts
  const { data: posts = [], isLoading } = useQuery<any[]>({
    queryKey: ["posts-list"],
    queryFn: () => api.get("/posts/"),
  });

  // Filter scheduled posts (status = approved in database)
  const scheduledPosts = posts.filter(
    (p) => p.status === "approved" && p.scheduled_at
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Helper date calculations
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDayPosts(null);
    setSelectedDateStr(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDayPosts(null);
    setSelectedDateStr(null);
  };

  // Check scheduled posts for specific calendar cell
  const getPostsForDay = (day: number) => {
    return scheduledPosts.filter((post) => {
      const sDate = new Date(post.scheduled_at);
      return (
        sDate.getFullYear() === year &&
        sDate.getMonth() === month &&
        sDate.getDate() === day
      );
    });
  };

  const handleDayClick = (day: number) => {
    const dayPosts = getPostsForDay(day);
    setSelectedDayPosts(dayPosts);
    setSelectedDateStr(`${monthNames[month]} ${day}, ${year}`);
  };

  // Compile calendar cells
  const cells: { day: number; currentMonth: boolean; hasPosts: boolean; count: number }[] = [];

  // Previous month trailing days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    cells.push({
      day: prevMonthTotalDays - i,
      currentMonth: false,
      hasPosts: false,
      count: 0,
    });
  }

  // Current month days
  for (let i = 1; i <= totalDays; i++) {
    const dayPosts = getPostsForDay(i);
    cells.push({
      day: i,
      currentMonth: true,
      hasPosts: dayPosts.length > 0,
      count: dayPosts.length,
    });
  }

  // Next month leading days to complete grid (multiples of 7)
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) {
    cells.push({
      day: i,
      currentMonth: false,
      hasPosts: false,
      count: 0,
    });
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Scheduling Calendar</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Visualize campaign launches, verify publishing balances, and track release dates.
            </p>
          </div>

          {/* Calendar Navigation Controller */}
          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-2xl shadow-sm self-start">
            <button
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold w-32 text-center">
              {monthNames[month]} {year}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          
          {/* Calendar Grid (8 columns) */}
          <div className="xl:col-span-8 glass-panel rounded-3xl p-6 border border-slate-200 dark:border-slate-800">
            {/* Week Headers */}
            <div className="calendar-grid text-center font-bold text-[10px] uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            {/* Day Cells */}
            {isLoading ? (
              <div className="flex justify-center items-center h-80">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              </div>
            ) : (
              <div className="calendar-grid gap-2">
                {cells.map((cell, idx) => (
                  <button
                    key={idx}
                    onClick={() => cell.currentMonth && handleDayClick(cell.day)}
                    disabled={!cell.currentMonth}
                    className={`calendar-day-cell rounded-2xl p-2 text-left relative flex flex-col justify-between border ${
                      cell.currentMonth
                        ? cell.hasPosts
                          ? "bg-indigo-500/5 border-indigo-500/30 text-slate-800 dark:text-indigo-400 font-bold hover:bg-indigo-500/10"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-350"
                        : "bg-slate-50/20 dark:bg-slate-950/10 border-transparent text-slate-350 dark:text-slate-650 cursor-not-allowed opacity-30"
                    }`}
                  >
                    <span className="text-[10px]">{cell.day}</span>
                    {cell.hasPosts && (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-lg bg-indigo-500 text-white font-mono text-[9px] font-bold mt-auto self-end">
                        {cell.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details Sidebar panel (4 columns) */}
          <div className="xl:col-span-4 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pl-1 flex items-center gap-1.5">
              <Calendar className="w-4 h-4" /> Selected Schedule details
            </h3>

            {selectedDateStr ? (
              <div className="glass-panel rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4 text-left">
                <div className="pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="font-bold text-sm text-indigo-500">{selectedDateStr}</h4>
                  <p className="text-[10px] text-slate-400">Scheduled releases</p>
                </div>

                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                  {selectedDayPosts && selectedDayPosts.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center">
                      No posts scheduled for this date.
                    </p>
                  ) : (
                    selectedDayPosts?.map((post) => (
                      <div
                        key={post.id}
                        className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-950/20 space-y-3"
                      >
                        <p className="text-xs leading-normal break-words">{post.content}</p>
                        
                        <div className="flex flex-wrap gap-1.5">
                          {post.platforms.map((p: any) => (
                            <span key={p.id} className="px-1.5 py-0.5 rounded text-[8px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold capitalize">
                              {p.platform}
                            </span>
                          ))}
                        </div>

                        <div className="flex justify-between items-center text-[9px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(post.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            By {post.creator_name}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="glass-panel rounded-3xl p-8 text-center border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                Click on any highlighted calendar cell to view scheduled release details.
              </div>
            )}
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
