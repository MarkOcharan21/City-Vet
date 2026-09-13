export default function ErrorState({

    title,

    message,

    onRetry

}){

    return(

        <div className="error-state">

            <div className="error-icon">

                ⚠️

            </div>

            <h2>{title}</h2>

            <p>{message}</p>

            <button
                onClick={onRetry}
                className="btn-primary"
            >

                Try Again

            </button>

        </div>

    );

}