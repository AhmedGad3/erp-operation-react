import { useState, useEffect } from "react";
import classes from "./NotFound.module.css";
import { NavLink } from "react-router-dom";
export default function NotFound() {
     return (
        <main>
            <div className="max-w-screen-xl mx-auto px-4 flex items-center justify-start h-screen md:px-8">
                <div className="max-w-lg mx-auto flex-1 flex-row-reverse gap-12 items-center justify-between md:max-w-none md:flex">
                     <div className="w-full lg:flex lg:justify-end lg:w-1/2 mx-5 my-12">
        <img src="https://user-images.githubusercontent.com/43953425/166269493-acd08ccb-4df3-4474-95c7-ad1034d3c070.svg" className="" alt="Page not found"/>
        </div>
                    <div className="mt-12 flex-1 max-w-lg space-y-3 md:mt-0">
                        <h3 className="text-indigo-600 font-semibold">
                            404 Error
                        </h3>
                        <p className="text-gray-800 text-4xl font-semibold sm:text-5xl">
                            Page not found
                        </p>
                        <p className="text-gray-600">
                            Sorry, the page you are looking for could not be found or has been removed.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-3">
       <NavLink
            to="/"
               className="block py-2 px-4 text-white font-medium bg-blue-600 duration-150 hover:bg-blue-500 active:bg-blue-700 rounded-lg"
             >

               Go To Home Page
             </NavLink>
           </div>
                    </div>
                </div>
            </div>
        </main>
    )
  }