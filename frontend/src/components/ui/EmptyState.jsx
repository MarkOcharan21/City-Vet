import { Link } from "react-router-dom";

export default function EmptyState({

    title,

    message,

    buttonText,

    buttonLink

}){

    return(

        <div className="empty-state">

            <div className="empty-icon">

                📂

            </div>

            <h2>{title}</h2>

            <p>{message}</p>

            {buttonText && (

                <Link
                    to={buttonLink}
                    className="btn-primary"
                >

                    {buttonText}

                </Link>

            )}

        </div>

    );

}