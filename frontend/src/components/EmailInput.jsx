import { Mail } from "lucide-react";

export default function EmailInput({

    value,

    onChange,

    placeholder="Enter your email",

    required=false

}){

    return(

        <div
            style={{
                position:"relative",
                width:"100%"
            }}
        >

            <Mail

                size={18}

                style={{

                    position:"absolute",

                    left:"16px",

                    top:"50%",

                    transform:"translateY(-50%)",

                    color:"#9CA3AF"

                }}

            />

            <input

                type="email"

                value={value}

                onChange={onChange}

                placeholder={placeholder}

                required={required}

                style={{

                    width:"100%",

                    height:"52px",

                    paddingLeft:"46px",

                    border:"1px solid #D1D5DB",

                    borderRadius:"12px",

                    fontSize:"15px",

                    boxSizing:"border-box",

                    outline:"none"

                }}

                onFocus={(e)=>{

                    e.target.style.borderColor="#0F766E";

                    e.target.style.boxShadow="0 0 0 4px rgba(15,118,110,.15)";

                }}

                onBlur={(e)=>{

                    e.target.style.borderColor="#D1D5DB";

                    e.target.style.boxShadow="none";

                }}

            />

        </div>

    );

}