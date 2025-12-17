// src/components/dashboard/StudentsTab.js
"use client";
import React, { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase";

export default function StudentsTab({
  allStudents,
  allCourses,
  setAllStudents,
  onCourseSave,
}) {
  const [viewingStudent, setViewingStudent] = useState(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [reschedulingLesson, setReschedulingLesson] = useState(null);

  const filteredStudents = allStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.id.toLowerCase().includes(studentSearch.toLowerCase())
  );

  // --- RESCHEDULE LOGIC ---
  const handleOpenReschedule = (student, enrollmentIndex, currentLesson) => {
    // We pass the INDEX of the enrollment array to know exactly which box we are in
    
    // FILTER: Only find lessons with the SAME ID (e.g., Lesson 5 -> only other Lesson 5s)
    const options = [];
    allCourses.forEach((c) => {
      const matchingLesson = c.lessons.find((l) => l.id === currentLesson.id);

      if (matchingLesson) {
        options.push({
          courseId: c.id,
          round: c._path.round,
          lessonId: matchingLesson.id,
          name: matchingLesson.name,
          dateStr: matchingLesson.dateStr,
          timeSlot: c.timeSlot,
          label: `${c.id} (${(c._path.round || "").replace("round_", "Round ")})`,
          _path: c._path,
        });
      }
    });

    options.sort((a, b) => a.dateStr.localeCompare(b.dateStr));

    setReschedulingLesson({
      student,
      enrollmentIndex, 
      lesson: currentLesson,
      options,
    });
  };

  const confirmReschedule = async (targetOption) => {
    const { student, enrollmentIndex, lesson } = reschedulingLesson;
    const studentId = student.id;
    const lessonId = lesson.id;

    // Get Origin info
    const originalEnrollment = student.enrollment[enrollmentIndex];
    const originCourseId = originalEnrollment.courseName;
    const originRound = originalEnrollment.round || originalEnrollment.iteration;

    const targetCourseId = targetOption.courseId;
    const targetRound = targetOption.round;

    // 1. Update Local Student State (UI)
    const updatedEnrollmentList = student.enrollment.map((enr, idx) => {
      if (idx === enrollmentIndex) {
        return {
          ...enr,
          lessons: enr.lessons.map((l) =>
            l.id === lessonId
              ? {
                  ...l,
                  dateStr: targetOption.dateStr,
                  timeSlot: targetOption.timeSlot,
                  actualCourseId: targetOption.courseId, 
                }
              : l
          ),
        };
      }
      return enr;
    });

    const updatedStudent = { ...student, enrollment: updatedEnrollmentList };
    setViewingStudent(updatedStudent);
    setAllStudents((prev) =>
      prev.map((s) => (s.id === studentId ? updatedStudent : s))
    );

    // 2. Update Firebase (Student)
    try {
      await updateDoc(doc(db, "students", studentId), {
        enrollment: updatedEnrollmentList,
      });
    } catch (e) {
      console.error("Error rescheduling student", e);
    }

    // 3. Update Courses (Rosters)
    // Only update rosters if the student is ACTUALLY moving to a different course/round
    const isSameCourse = originCourseId === targetCourseId && originRound === targetRound;

    if (!isSameCourse) {
        // A. Remove from Origin
        const originCourse = allCourses.find(
          (c) => c.id === originCourseId && (c._path.round === originRound || !originRound)
        );
        if (originCourse) {
          const updatedOrigin = {
            ...originCourse,
            lessons: originCourse.lessons.map((l) =>
              l.id === lessonId
                ? { ...l, students: l.students.filter((s) => s !== studentId) }
                : l
            ),
          };
          await onCourseSave(updatedOrigin);
        }

        // B. Add to Target
        const targetCourse = allCourses.find(
          (c) => c.id === targetCourseId && c._path.round === targetRound
        );
        if (targetCourse) {
          const updatedTarget = {
            ...targetCourse,
            lessons: targetCourse.lessons.map((l) =>
              l.id === lessonId
                ? {
                    ...l,
                    students: l.students.includes(studentId)
                      ? l.students
                      : [...l.students, studentId],
                  }
                : l
            ),
          };
          await onCourseSave(updatedTarget);
        }
    }

    setReschedulingLesson(null);
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-150px)]">
      {/* List Side */}
      <div className="w-1/3 bg-white shadow rounded p-4 overflow-y-auto">
        <input
          className="w-full border p-2 rounded mb-4"
          placeholder="Search student..."
          value={studentSearch}
          onChange={(e) => setStudentSearch(e.target.value)}
        />
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">ID</th>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Courses</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((s) => (
              <tr
                key={s.id}
                onClick={() => setViewingStudent(s)}
                className={`cursor-pointer hover:bg-blue-50 border-b ${
                  viewingStudent?.id === s.id ? "bg-blue-100" : ""
                }`}
              >
                <td className="p-2">{s.id}</td>
                <td className="p-2">{s.name}</td>
                <td className="p-2 text-xs text-gray-500">
                  {s.enrollment.map((e) => e.courseName).join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Side */}
      <div className="w-2/3 bg-white shadow rounded p-6 overflow-y-auto">
        {viewingStudent ? (
          <div>
            {/* HEADER */}
            <div className="flex justify-between items-start mb-6 border-b pb-4">
              <div>
                <h2 className="text-3xl font-bold text-gray-800">
                  {viewingStudent.name}
                </h2>
                <p className="text-gray-500 font-mono text-sm mt-1">
                  ID: {viewingStudent.id}
                </p>
              </div>
              <div className="text-right">
                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
                  {viewingStudent.personalInfo?.level || "N/A"}
                </span>
              </div>
            </div>

            {/* FULL PERSONAL INFO GRID */}
            <div className="bg-gray-50 p-4 rounded-lg mb-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="block text-xs font-bold text-gray-400 uppercase">
                  Chinese Name
                </span>
                <span className="font-medium text-gray-700">
                  {viewingStudent.personalInfo?.chineseName || "-"}
                </span>
              </div>
              <div>
                <span className="block text-xs font-bold text-gray-400 uppercase">
                  Sex
                </span>
                <span className="font-medium text-gray-700">
                  {viewingStudent.personalInfo?.sex === "M"
                    ? "Male"
                    : viewingStudent.personalInfo?.sex === "F"
                    ? "Female"
                    : "-"}
                </span>
              </div>
              <div>
                <span className="block text-xs font-bold text-gray-400 uppercase">
                  Language
                </span>
                <span className="font-medium text-gray-700">
                  {viewingStudent.personalInfo?.preferredLanguage || "-"}
                </span>
              </div>
              <div>
                <span className="block text-xs font-bold text-gray-400 uppercase">
                  Fav Character
                </span>
                <span className="font-medium text-gray-700">
                  {viewingStudent.personalInfo?.favChar || "-"}
                </span>
              </div>

              <div>
                <span className="block text-xs font-bold text-gray-400 uppercase">
                  Parent Name
                </span>
                <span className="font-medium text-gray-700">
                  {viewingStudent.personalInfo?.parentName || "-"}
                </span>
              </div>
              <div className="col-span-2">
                <span className="block text-xs font-bold text-gray-400 uppercase">
                  Parent Contact
                </span>
                <span className="font-medium text-gray-700">
                  {viewingStudent.personalInfo?.parentContact || "-"}
                </span>
              </div>
              <div>
                <span className="block text-xs font-bold text-gray-400 uppercase">
                  Comfort Method
                </span>
                <span className="font-medium text-gray-700">
                  {viewingStudent.personalInfo?.comfortMethod || "-"}
                </span>
              </div>

              <div className="col-span-2">
                <span className="block text-xs font-bold text-gray-400 uppercase">
                  Allergies
                </span>
                <span className="font-bold text-red-600">
                  {viewingStudent.personalInfo?.allergies || "NIL"}
                </span>
              </div>
              <div className="col-span-2">
                <span className="block text-xs font-bold text-gray-400 uppercase">
                  Medical Conditions
                </span>
                <span className="font-medium text-gray-700">
                  {viewingStudent.personalInfo?.condition || "None"}
                </span>
              </div>
            </div>

            {/* ENROLLMENT BLOCKS - SEPARATED BY INDEX */}
            <h3 className="text-lg font-bold mb-4 text-gray-800">
              Class Schedule
            </h3>
            {viewingStudent.enrollment.length === 0 && (
              <p className="text-gray-400 italic">No active enrollments.</p>
            )}
            
            {viewingStudent.enrollment.map((enr, idx) => (
              <div key={idx} className="mb-8 border border-gray-200 rounded-lg shadow-sm overflow-hidden bg-white">
                <div className="bg-gradient-to-r from-gray-100 to-white p-3 border-b flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-800 text-lg">
                      {enr.courseName}
                    </span>
                    <span className="text-xs text-gray-500 uppercase tracking-wider font-bold">
                      {(enr.round || enr.iteration || "Unknown").replace("round_", "Round ")}
                    </span>
                  </div>
                  <div className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-bold border border-blue-100">
                     Enrolled
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-gray-500 text-xs uppercase">
                        <th className="p-3 text-center w-16">#</th>
                        <th className="p-3 text-left">Date (Click to Reschedule)</th>
                        <th className="p-3 text-center">Time</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enr.lessons.map((l) => (
                        <tr key={l.id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="p-3 text-center font-bold text-gray-400">
                            L{l.id}
                          </td>
                          <td
                            className="p-3 cursor-pointer group"
                            onClick={() =>
                              handleOpenReschedule(viewingStudent, idx, l)
                            }
                          >
                            <div className="font-bold text-blue-600 group-hover:underline">
                              {l.dateStr
                                ? l.dateStr.split("-").slice(1).join("/")
                                : "-"}
                              <span className="text-gray-400 font-normal ml-2 text-xs">
                                ({l.dateStr})
                              </span>
                            </div>
                            {l.actualCourseId && (
                              <div className="text-[10px] mt-1 inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded border border-yellow-200">
                                <span>⚡ Makeup: {l.actualCourseId}</span>
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-center font-mono text-gray-600">
                            {l.timeSlot || "-"}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                l.completed
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              {l.completed ? "Done" : "Pending"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <svg
              className="w-16 h-16 mb-4 text-gray-200"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <p>Select a student from the list to view their full profile.</p>
          </div>
        )}
      </div>

      {/* RESCHEDULE MODAL */}
      {reschedulingLesson && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="mb-4">
              <h3 className="font-bold text-xl text-gray-800">
                Reschedule Lesson {reschedulingLesson.lesson.id}
              </h3>
              <p className="text-sm text-gray-500">
                Current:{" "}
                <span className="font-bold text-red-600">
                  {reschedulingLesson.lesson.dateStr}
                </span>{" "}
                ({reschedulingLesson.lesson.timeSlot})
              </p>
            </div>

            <p className="mb-2 text-xs font-bold text-gray-400 uppercase tracking-wide">
              Available Sessions for Lesson {reschedulingLesson.lesson.id}
            </p>

            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {reschedulingLesson.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => confirmReschedule(opt)}
                  className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all group"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-gray-800 group-hover:text-blue-700">
                      {opt.dateStr}
                    </span>
                    <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                      {opt.timeSlot}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    <span className="font-semibold text-blue-600">
                      {opt.label}
                    </span>
                  </div>
                </button>
              ))}
              {reschedulingLesson.options.length === 0 && (
                <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-lg">
                  <p className="text-gray-400 italic text-sm">
                    No other courses found containing Lesson{" "}
                    {reschedulingLesson.lesson.id}.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t">
              <button
                onClick={() => setReschedulingLesson(null)}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
