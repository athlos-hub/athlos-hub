"use client"

import { useState } from 'react';
import Link from 'next/link';
import {FaArrowRightLong} from "react-icons/fa6";
import {MainSection} from "@/types/components/header";

interface DropdownNavbarProps {
    categoryName: string;
    mainSections: MainSection[];
    isOpen: boolean;
}

export default function DropdownNavbar({ mainSections, isOpen, categoryName }: DropdownNavbarProps) {
    const [selectedSection, setSelectedSection] = useState(
        mainSections.length > 0 ? 0 : -1
    );

    if (!isOpen) return null;

    return (
        <div className="absolute top-full mt-4 left-1/2 transform -translate-x-1/2 max-w-[50rem] w-full animate-in fade-in slide-in-from-top-2 duration-200 z-50">
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-2 border border-[#97979730] rounded-xl overflow-hidden">
                    {/* seções principais */}
                    <div className="py-8 px-5 flex flex-col gap-7 bg-[#F7F7FB]">
                        <span className="text-lg text-main font-semibold tracking-wide">{categoryName}</span>
                        <div className="flex flex-col gap-6">
                            {mainSections.map((section, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedSection(idx)}
                                    onMouseEnter={() => setSelectedSection(idx)}
                                    className="flex items-center gap-3 transition-all group text-left"
                                >
                                    <div className={`rounded-xl size-14 shadow-lg flex items-center justify-center transition-all ${
                                        selectedSection === idx
                                            ? 'bg-[#009C54] text-white '
                                            : 'bg-white text-[#009C54] group-hover:scale-105'
                                    }`}>
                                        {section.icon}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center font-medium text-main text-xl">
                                            <span className={`${selectedSection === idx ? 'text-[#009C54]' : ''}`}>{section.label}</span>
                                            <span className="ml-2">
                                                <FaArrowRightLong className={`transition-transform ${
                                                    selectedSection === idx ? 'translate-x-1 text-[#009C54]' : ''
                                                }`} />
                                            </span>
                                        </div>
                                        <div className="text-sm text-[#6F6C90] mt-0.5">
                                            {section.description}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* sub-itens */}
                    {selectedSection >= 0 && mainSections[selectedSection] && (
                        <div className="py-8 px-5 flex flex-col gap-4">
                            <span className="text-lg text-main font-semibold tracking-wide">
                              {mainSections[selectedSection].label}
                            </span>
                            <div className="flex flex-col gap-2">
                                {mainSections[selectedSection].subItems.map((subItem, idx) => (
                                    <Link
                                        key={idx}
                                        href={subItem.href}
                                        className="flex flex-col gap-1 p-3 rounded-lg hover:bg-[#F7F7FB] transition-colors group"
                                    >
                                        <div className="font-medium text-main group-hover:text-[#009C54] transition-colors flex items-center gap-2">
                                            {subItem.label}
                                            <FaArrowRightLong className="opacity-0 group-hover:opacity-100 transition-opacity text-sm" />
                                        </div>
                                        {subItem.description && (
                                            <div className="text-sm text-[#6F6C90]">
                                                {subItem.description}
                                            </div>
                                        )}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}