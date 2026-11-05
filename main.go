package main

import (
	"embed"
	"os"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"

	"leitor-markdown/internal/app"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	initialTarget := ""
	if len(os.Args) > 1 {
		for _, arg := range os.Args[1:] {
			if len(arg) > 0 && arg[0] != '-' {
				initialTarget = arg
				break
			}
		}
	}

	application := app.New(initialTarget)

	err := wails.Run(&options.App{
		Title:     "Leitor Markdown",
		Width:     1320,
		Height:    840,
		MinWidth:  820,
		MinHeight: 520,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 15, G: 23, B: 42, A: 1},
		OnStartup:        application.Startup,
		OnShutdown:       application.Shutdown,
		Bind: []interface{}{
			application,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
